import { Cause, Effect, Option, type Scope } from 'effect'

import type { RuntimeStatus } from './runtimeStatus.js'

const DRAIN_BUDGET_MS = 5

/** The plain functions the runtime uses to buffer, drain, and gate Messages. */
export type MessageQueue<Message> = Readonly<{
  enqueueMessage: (message: Message) => void
  enqueueMessageEffect: (message: Message) => Effect.Effect<void>
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

    const enqueueMessage = (message: Message): void => {
      if (status.isRuntimeDisposed || status.isCrashed) {
        return
      }
      pendingMessages.push(message)
      if (!isBootComplete || status.isRenderingFrame) {
        return
      }
      drainPendingMessages()
    }

    const enqueueMessageEffect = (message: Message) =>
      Effect.sync(() => enqueueMessage(message))

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
      drainPendingMessages,
      resetDrainBudget,
      completeBoot,
    }
  })
