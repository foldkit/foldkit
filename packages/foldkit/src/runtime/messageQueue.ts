import {
  Array,
  Cause,
  Effect,
  Number,
  Option,
  Predicate,
  type Scope,
} from 'effect'

import type { RuntimeStatus } from './runtimeStatus.js'

const DRAIN_BUDGET_MS = 5

type ProcessingWaiter = Readonly<{
  firstSequence: number
  messageCount: number
  settle: (processedCount: number) => void
}>

/** The plain functions the runtime uses to buffer, drain, and gate Messages. */
export type MessageQueue<Message> = Readonly<{
  enqueueMessage: (message: Message) => void
  enqueueMessageEffect: (message: Message) => Effect.Effect<void>
  enqueueMessagesAndAwaitProcessing: (
    messages: ReadonlyArray<Message>,
  ) => Effect.Effect<number>
  settleAwaitedMessages: () => void
  drainPendingMessages: () => void
  resetDrainBudget: () => void
  completeBoot: () => void
}>

/**
 * Builds the Message queue for one runtime. `enqueueMessage` buffers a
 * Message and drains the buffer on the spot, so update runs on the
 * dispatching stack with no fiber hop in between. The buffer, the gates,
 * and the drain are plain JavaScript on purpose: nothing on the
 * per-Message path goes through an Effect or a Ref. Until `completeBoot`
 * runs, Messages only buffer. Once the drains in one task have held the
 * stack for longer than the budget, the rest hands off to a new task so
 * the browser can paint, and the channel that schedules that task is
 * closed by the surrounding scope.
 *
 * `enqueueMessagesAndAwaitProcessing` enqueues Messages in one synchronous
 * step, so no other Message lands between them, and succeeds with how many
 * of them update processed once every one is processed or dropped. The
 * runtime drops a Message that arrives after a crash or dispose, the
 * Message whose update throws, and every Message still buffered when the
 * runtime crashes or the queue closes. The processed Messages are always a
 * prefix of the given ones. The renderer calls `settleAwaitedMessages`
 * after a crash so that waiting callers learn the outcome without another
 * drain.
 */
export const makeMessageQueue = <Message>({
  status,
  processMessage,
  crashWith,
}: Readonly<{
  status: RuntimeStatus
  processMessage: (message: Message) => void
  crashWith: (
    cause: Cause.Cause<never>,
    maybeMessage: Option.Option<Message>,
  ) => Effect.Effect<void>
}>): Effect.Effect<MessageQueue<Message>, never, Scope.Scope> =>
  Effect.gen(function* () {
    let pendingMessages: Array<Message> = []
    let isProcessingMessages = false
    // NOTE: a Message arriving before boot completes, say a navigation
    // event during an async boot step, is buffered, not processed.
    // Processing it would race the init render, DevTools recording, and
    // Subscription attachment. The flag flips as the last act of boot,
    // which then drains the buffer.
    let isBootComplete = false
    let isQueueClosed = false

    // NOTE: Messages are processed in arrival order, so the Message with
    // sequence `n` has been processed exactly when more than `n` Messages
    // have been processed. A Message whose update throws does not count,
    // and no Message is processed after it.
    let enqueuedCount = 0
    let processedCount = 0
    let processingWaiters: Array<ProcessingWaiter> = []

    const bufferMessage = (message: Message): void => {
      pendingMessages.push(message)
      enqueuedCount++
    }

    const drainUnlessHeld = (): void => {
      if (!isBootComplete || status.isRenderingFrame) {
        return
      }
      drainPendingMessages()
    }

    const enqueueMessage = (message: Message): void => {
      if (status.isRuntimeDisposed || status.isCrashed) {
        return
      }
      bufferMessage(message)
      drainUnlessHeld()
    }

    const enqueueMessageEffect = (message: Message) =>
      Effect.sync(() => enqueueMessage(message))

    const settleAwaitedMessages = (): void => {
      if (Array.isArrayEmpty(processingWaiters)) {
        return
      }

      const isStopped =
        isQueueClosed || status.isRuntimeDisposed || status.isCrashed
      const isSettled = ({
        firstSequence,
        messageCount,
      }: ProcessingWaiter): boolean =>
        processedCount >= firstSequence + messageCount || isStopped
      const settled = Array.filter(processingWaiters, isSettled)
      processingWaiters = Array.filter(
        processingWaiters,
        Predicate.not(isSettled),
      )

      for (const { firstSequence, messageCount, settle } of settled) {
        settle(
          Number.clamp(processedCount - firstSequence, {
            minimum: 0,
            maximum: messageCount,
          }),
        )
      }
    }

    const enqueueMessagesAndAwaitProcessing = (
      messages: ReadonlyArray<Message>,
    ): Effect.Effect<number> =>
      Effect.callback<number>(resume => {
        if (
          Array.isReadonlyArrayEmpty(messages) ||
          isQueueClosed ||
          status.isRuntimeDisposed ||
          status.isCrashed
        ) {
          resume(Effect.succeed(0))
          return
        }

        processingWaiters.push({
          firstSequence: enqueuedCount,
          messageCount: messages.length,
          settle: processedMessageCount =>
            resume(Effect.succeed(processedMessageCount)),
        })
        for (const message of messages) {
          bufferMessage(message)
        }
        drainUnlessHeld()
      })

    let currentMessage = Option.none<Message>()

    // NOTE: escape hatch for synchronous bursts, so the page keeps
    // painting under pathological load (for example, a fiber dispatching
    // thousands of Messages in one task, or a fully synchronous Command
    // chain). Bursts arrive as many single-Message drains within one
    // browser task, so the budget is cumulative across drains: it
    // accumulates processing time and resets when the browser demonstrably
    // got control back (a render frame ran, or the gap since the last
    // drain exceeds the budget). Once over budget, processing defers to a
    // MessageChannel tick, which starts a new task so a pending frame can
    // paint. setTimeout(0) would be clamped to 4ms+; MessageChannel
    // delivers in ~0.5ms.
    let syncWorkMsSinceYield = 0
    let lastDrainEndedAt = 0
    let isDrainDeferredToNextTask = false
    let maybeDeferredDrainChannel: MessageChannel | null = null

    const scheduleDeferredDrain = (): void => {
      if (maybeDeferredDrainChannel === null) {
        maybeDeferredDrainChannel = new MessageChannel()
        maybeDeferredDrainChannel.port2.onmessage = () => {
          isDrainDeferredToNextTask = false
          syncWorkMsSinceYield = 0
          drainPendingMessages()
        }
      }
      isDrainDeferredToNextTask = true
      maybeDeferredDrainChannel.port1.postMessage(null)
    }

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (maybeDeferredDrainChannel !== null) {
          maybeDeferredDrainChannel.port1.close()
          maybeDeferredDrainChannel.port2.close()
          maybeDeferredDrainChannel = null
        }

        isQueueClosed = true
        settleAwaitedMessages()
      }),
    )

    const drainPendingMessages = (): void => {
      if (
        !isBootComplete ||
        isProcessingMessages ||
        status.isRenderingFrame ||
        isDrainDeferredToNextTask ||
        status.isRuntimeDisposed ||
        status.isCrashed
      ) {
        return
      }
      const drainStartedAt = performance.now()
      if (drainStartedAt - lastDrainEndedAt > DRAIN_BUDGET_MS) {
        syncWorkMsSinceYield = 0
      }
      if (syncWorkMsSinceYield > DRAIN_BUDGET_MS) {
        scheduleDeferredDrain()
        return
      }
      isProcessingMessages = true
      try {
        while (pendingMessages.length > 0) {
          const batch = pendingMessages
          pendingMessages = []
          for (let index = 0; index < batch.length; index++) {
            const message = batch[index]!
            currentMessage = Option.some(message)
            processMessage(message)
            processedCount++

            const hasRemainingWork =
              index + 1 < batch.length || pendingMessages.length > 0
            if (
              hasRemainingWork &&
              syncWorkMsSinceYield + (performance.now() - drainStartedAt) >
                DRAIN_BUDGET_MS
            ) {
              // NOTE: unprocessed batch Messages arrived before
              // anything in pendingMessages, so they go back to the
              // front to keep arrival order.
              pendingMessages = batch.slice(index + 1).concat(pendingMessages)
              scheduleDeferredDrain()
              return
            }
          }
        }
      } catch (error) {
        Effect.runFork(crashWith(Cause.die(error), currentMessage))
      } finally {
        const drainEndedAt = performance.now()
        syncWorkMsSinceYield += drainEndedAt - drainStartedAt
        lastDrainEndedAt = drainEndedAt
        isProcessingMessages = false
        settleAwaitedMessages()
      }
    }

    const resetDrainBudget = (): void => {
      syncWorkMsSinceYield = 0
    }

    const completeBoot = (): void => {
      isBootComplete = true
      drainPendingMessages()
    }

    return {
      enqueueMessage,
      enqueueMessageEffect,
      enqueueMessagesAndAwaitProcessing,
      settleAwaitedMessages,
      drainPendingMessages,
      resetDrainBudget,
      completeBoot,
    }
  })
