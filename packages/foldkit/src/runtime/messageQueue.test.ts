import { Effect, Exit, Fiber, Scope } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeMessageQueue } from './messageQueue.js'
import { makeRuntimeStatus } from './runtimeStatus.js'

const SLOW_MESSAGE_DURATION_MS = 10

const openScopes: Array<Scope.Closeable> = []

afterEach(() => {
  for (const scope of openScopes.splice(0)) {
    Effect.runSync(Scope.close(scope, Exit.void))
  }
  vi.restoreAllMocks()
})

const makeHarness = () => {
  let fakeNow = 0
  vi.spyOn(performance, 'now').mockImplementation(() => fakeNow)

  const status = makeRuntimeStatus()
  const processed: Array<string> = []
  const scope = Effect.runSync(Scope.make())
  openScopes.push(scope)

  const queue = Effect.runSync(
    Effect.provideService(
      makeMessageQueue<string>({
        status,
        processMessage: message => {
          if (message === 'Boom') {
            throw new Error('update threw')
          }
          if (message === 'Slow') {
            fakeNow += SLOW_MESSAGE_DURATION_MS
          }
          processed.push(message)
          if (message === 'Echo') {
            queue.enqueueMessage('EchoReply')
          }
        },
        crashWith: () =>
          Effect.sync(() => {
            status.isCrashed = true
            queue.settleAwaitedMessages()
          }),
      }),
      Scope.Scope,
      scope,
    ),
  )

  const enqueueAndAwait = (messages: ReadonlyArray<string>) =>
    Effect.runFork(queue.enqueueMessagesAndAwaitProcessing(messages))

  const awaitProcessedCount = (fiber: Fiber.Fiber<number>) =>
    Effect.runPromise(Fiber.join(fiber))

  const closeQueue = () => Effect.runSync(Scope.close(scope, Exit.void))

  return {
    status,
    queue,
    processed,
    enqueueAndAwait,
    awaitProcessedCount,
    closeQueue,
  }
}

describe('enqueueMessagesAndAwaitProcessing', () => {
  it('succeeds with the count once update processes every Message', async () => {
    const { queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()

    expect(await awaitProcessedCount(enqueueAndAwait(['Ok', 'Slow']))).toBe(2)
    expect(processed).toEqual(['Ok', 'Slow'])
  })

  it('succeeds with zero for no Messages', async () => {
    const { queue, enqueueAndAwait, awaitProcessedCount } = makeHarness()
    queue.completeBoot()

    expect(await awaitProcessedCount(enqueueAndAwait([]))).toBe(0)
  })

  it('waits for boot to complete before settling buffered Messages', async () => {
    const { queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()

    const fiber = enqueueAndAwait(['Ok'])

    expect(processed).toEqual([])

    queue.completeBoot()

    expect(await awaitProcessedCount(fiber)).toBe(1)
    expect(processed).toEqual(['Ok'])
  })

  it('succeeds with zero for Messages that arrive after a crash', async () => {
    const { status, queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()
    status.isCrashed = true

    expect(await awaitProcessedCount(enqueueAndAwait(['Ok']))).toBe(0)
    expect(processed).toEqual([])
  })

  it('succeeds with zero for Messages that arrive after dispose', async () => {
    const { status, queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()
    status.isRuntimeDisposed = true

    expect(await awaitProcessedCount(enqueueAndAwait(['Ok']))).toBe(0)
    expect(processed).toEqual([])
  })

  it('counts only the Messages before the one whose update throws', async () => {
    const { status, queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()

    expect(
      await awaitProcessedCount(enqueueAndAwait(['Ok', 'Boom', 'Ok'])),
    ).toBe(1)
    expect(status.isCrashed).toBe(true)
    expect(processed).toEqual(['Ok'])
  })

  it('counts only its own Messages when update enqueues another on the same stack', async () => {
    const { queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()

    expect(await awaitProcessedCount(enqueueAndAwait(['Echo', 'Boom']))).toBe(1)
    expect(processed).toEqual(['Echo'])
  })

  it('keeps the Messages together when their drain is deferred', async () => {
    const { queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()
    queue.enqueueMessage('Slow')

    const fiber = enqueueAndAwait(['Ok', 'Ok'])
    queue.enqueueMessage('Later')

    expect(processed).toEqual(['Slow'])
    expect(await awaitProcessedCount(fiber)).toBe(2)
    expect(processed).toEqual(['Slow', 'Ok', 'Ok', 'Later'])
  })

  it('settles buffered Messages when a deferred drain crashes', async () => {
    const { queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()
    queue.completeBoot()
    queue.enqueueMessage('Slow')

    const fiber = enqueueAndAwait(['Ok', 'Boom', 'Ok'])

    expect(processed).toEqual(['Slow'])
    expect(await awaitProcessedCount(fiber)).toBe(1)
    expect(processed).toEqual(['Slow', 'Ok'])
  })

  it('settles buffered Messages when the runtime crashes outside the drain', async () => {
    const { status, queue, processed, enqueueAndAwait, awaitProcessedCount } =
      makeHarness()

    const fiber = enqueueAndAwait(['Ok'])
    status.isCrashed = true
    queue.settleAwaitedMessages()

    expect(await awaitProcessedCount(fiber)).toBe(0)
    expect(processed).toEqual([])
  })

  it('succeeds with zero for buffered Messages when the queue closes', async () => {
    const { processed, enqueueAndAwait, awaitProcessedCount, closeQueue } =
      makeHarness()

    const fiber = enqueueAndAwait(['Ok'])
    closeQueue()

    expect(await awaitProcessedCount(fiber)).toBe(0)
    expect(processed).toEqual([])
  })
})
