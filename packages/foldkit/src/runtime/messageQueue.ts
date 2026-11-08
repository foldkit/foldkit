import { Cause, Effect, Option, Result, type Scope } from 'effect'

import type { RuntimeStatus } from './runtimeStatus.js'

const DRAIN_BUDGET_MS = 5
const TERMINATED_RECEIPT_REASON =
  'Runtime terminated before the queued Message was processed.'

/** The plain functions the runtime uses to buffer, drain, and gate Messages. */
export type MessageQueue<Message, Processed = void> = Readonly<{
  enqueueMessage: (message: Message, isCurrent?: () => boolean) => void
  enqueueMessageEffect: (
    message: Message,
    isCurrent?: () => boolean,
  ) => Effect.Effect<void>
  enqueueMessageReceiptEffect: (
    message: Message,
    isCurrent?: () => boolean,
  ) => Effect.Effect<Result.Result<Option.Option<Processed>, string>>
  drainPendingMessages: () => void
  drainDeferredNow: () => void
  resetDrainBudget: () => void
  isAnyMessageDeferred: () => boolean
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
 */
export const makeMessageQueue = <Message, Processed = void>({
  status,
  processMessage,
  crashWith,
}: Readonly<{
  status: RuntimeStatus
  processMessage: (message: Message) => Processed
  crashWith: (
    cause: Cause.Cause<never>,
    maybeMessage: Option.Option<Message>,
  ) => Effect.Effect<void>
}>): Effect.Effect<MessageQueue<Message, Processed>, never, Scope.Scope> =>
  Effect.gen(function* () {
    type PendingMessage = Readonly<{
      message: Message
      isCurrent?: () => boolean
      settle?: (
        receipt: Result.Result<Option.Option<Processed>, string>,
      ) => void
    }>
    let pendingMessages: Array<PendingMessage> = []
    let isProcessingMessages = false
    // NOTE: a Message arriving before boot completes, say a navigation
    // event during an async boot step, is buffered, not processed.
    // Processing it would race the init render, DevTools recording, and
    // Subscription attachment. The flag flips as the last act of boot,
    // which then drains the buffer.
    let isBootComplete = false

    const enqueue = (
      message: Message,
      isCurrent?: () => boolean,
      settle?: (
        receipt: Result.Result<Option.Option<Processed>, string>,
      ) => void,
    ): void => {
      if (status.isRuntimeDisposed || status.isCrashed) {
        settle?.(Result.fail(TERMINATED_RECEIPT_REASON))
        return
      }
      pendingMessages.push({
        message,
        ...(isCurrent === undefined ? {} : { isCurrent }),
        ...(settle === undefined ? {} : { settle }),
      })
      if (!isBootComplete || status.isRenderingFrame) {
        return
      }
      drainPendingMessages()
    }

    const enqueueMessage = (
      message: Message,
      isCurrent?: () => boolean,
    ): void => enqueue(message, isCurrent)

    const enqueueMessageEffect = (
      message: Message,
      isCurrent?: () => boolean,
    ) => Effect.sync(() => enqueueMessage(message, isCurrent))

    const enqueueMessageReceiptEffect = (
      message: Message,
      isCurrent?: () => boolean,
    ) =>
      Effect.callback<Result.Result<Option.Option<Processed>, string>>(
        resume => {
          enqueue(message, isCurrent, receipt =>
            resume(Effect.succeed(receipt)),
          )
        },
      )

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
        for (const pendingMessage of pendingMessages) {
          pendingMessage.settle?.(Result.fail(TERMINATED_RECEIPT_REASON))
        }
        pendingMessages = []
      }),
    )

    const drainPendingMessages = (): void => {
      if (status.isRuntimeDisposed || status.isCrashed) {
        for (const pendingMessage of pendingMessages) {
          pendingMessage.settle?.(Result.fail(TERMINATED_RECEIPT_REASON))
        }
        pendingMessages = []
        return
      }
      if (
        !isBootComplete ||
        isProcessingMessages ||
        status.isRenderingFrame ||
        isDrainDeferredToNextTask
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
      let activeBatch: Array<PendingMessage> = []
      let nextUnsettledIndex = 0
      try {
        while (pendingMessages.length > 0) {
          const batch = pendingMessages
          activeBatch = batch
          nextUnsettledIndex = 0
          pendingMessages = []
          for (let index = 0; index < batch.length; index++) {
            const { message, isCurrent, settle } = batch[index]!
            if (isCurrent === undefined || isCurrent()) {
              currentMessage = Option.some(message)
              const processed = processMessage(message)
              settle?.(Result.succeed(Option.some(processed)))
            } else {
              settle?.(Result.succeed(Option.none()))
            }
            nextUnsettledIndex = index + 1

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
              activeBatch = []
              nextUnsettledIndex = 0
              scheduleDeferredDrain()
              return
            }
          }
          activeBatch = []
          nextUnsettledIndex = 0
        }
      } catch (error) {
        for (const pendingMessage of activeBatch.slice(nextUnsettledIndex)) {
          pendingMessage.settle?.(Result.fail(TERMINATED_RECEIPT_REASON))
        }
        for (const pendingMessage of pendingMessages) {
          pendingMessage.settle?.(Result.fail(TERMINATED_RECEIPT_REASON))
        }
        pendingMessages = []
        Effect.runFork(crashWith(Cause.die(error), currentMessage))
      } finally {
        const drainEndedAt = performance.now()
        syncWorkMsSinceYield += drainEndedAt - drainStartedAt
        lastDrainEndedAt = drainEndedAt
        isProcessingMessages = false
      }
    }

    const drainDeferredNow = (): void => {
      if (!isDrainDeferredToNextTask) {
        return
      }

      isDrainDeferredToNextTask = false
      syncWorkMsSinceYield = 0
      drainPendingMessages()
    }

    const resetDrainBudget = (): void => {
      syncWorkMsSinceYield = 0
    }

    const isAnyMessageDeferred = (): boolean =>
      isDrainDeferredToNextTask && pendingMessages.length > 0

    const completeBoot = (): void => {
      isBootComplete = true
      drainPendingMessages()
    }

    return {
      enqueueMessage,
      enqueueMessageEffect,
      enqueueMessageReceiptEffect,
      drainPendingMessages,
      drainDeferredNow,
      resetDrainBudget,
      isAnyMessageDeferred,
      completeBoot,
    }
  })
