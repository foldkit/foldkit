import { Deferred, Effect, Exit, Fiber, Layer } from 'effect'
import { Socket } from 'effect/socket'
import { TestClock } from 'effect/testing'
import { describe, expect, test } from 'vitest'

import { ManageChatSocketLive, managedResources } from './main'

type WebSocketEventName = 'open' | 'message' | 'error' | 'close'
type WebSocketEventListener = (event: Socket.WebSocketEvent) => void

const CONNECTING_READY_STATE = 0
const OPEN_READY_STATE = 1
const CLOSED_READY_STATE = 3

class TestWebSocket implements Socket.WebSocketLike {
  readonly sentData: Array<string | Uint8Array<ArrayBuffer>> = []
  closeCount = 0
  readonly readinessStarted: Deferred.Deferred<void>
  private currentReadyState = CONNECTING_READY_STATE

  private readonly listeners = new Map<
    WebSocketEventName,
    Set<WebSocketEventListener>
  >()

  constructor(readinessStarted: Deferred.Deferred<void>) {
    this.readinessStarted = readinessStarted
  }

  get readyState(): number {
    return this.currentReadyState
  }

  addEventListener(
    type: WebSocketEventName,
    listener: WebSocketEventListener,
  ): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)

    if (type === 'error') {
      Effect.runSync(Deferred.succeed(this.readinessStarted, undefined))
    }
  }

  removeEventListener(
    type: WebSocketEventName,
    listener: WebSocketEventListener,
  ): void {
    this.listeners.get(type)?.delete(listener)
  }

  close(): void {
    this.closeCount += 1
    this.currentReadyState = CLOSED_READY_STATE
  }

  send(data: string | Uint8Array<ArrayBuffer>): void {
    this.sentData.push(data)
  }

  emit(type: WebSocketEventName): void {
    if (type === 'open') {
      this.currentReadyState = OPEN_READY_STATE
    }

    this.listeners.get(type)?.forEach(listener => listener({ type }))
  }

  listenerCount(type: WebSocketEventName): number {
    return this.listeners.get(type)?.size ?? 0
  }
}

const makeTestSocket = () => {
  const readinessStarted = Deferred.makeUnsafe<void>()
  const socket = new TestWebSocket(readinessStarted)
  const constructorLayer = Layer.succeed(
    Socket.WebSocketConstructor,
    () => socket,
  )
  const live = ManageChatSocketLive.pipe(Layer.provide(constructorLayer))

  return { socket, live }
}

// oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
const acquireChatSocket = managedResources.chatSocket.acquire(null).pipe(
  Effect.mapError(error =>
    error instanceof Error ? error : new Error('Unknown acquisition error'),
  ),
  Effect.orDie,
)

const expectReadinessListenersRemoved = (socket: TestWebSocket): void => {
  expect(socket.listenerCount('open')).toBe(0)
  expect(socket.listenerCount('error')).toBe(0)
}

const expectSocketClosed = (socket: TestWebSocket): void => {
  expect(socket.closeCount).toBe(1)
  expect(socket.readyState).toBe(CLOSED_READY_STATE)
  expectReadinessListenersRemoved(socket)
}

describe('ManageChatSocketLive', () => {
  test('closes a socket when readiness is interrupted before open', async () => {
    const { socket, live } = makeTestSocket()

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const acquisition = yield* Effect.forkChild(acquireChatSocket, {
            startImmediately: true,
          })

          yield* Deferred.await(socket.readinessStarted)
          yield* Fiber.interrupt(acquisition)
        }).pipe(Effect.provide(live)),
      ),
    )

    expectSocketClosed(socket)
  })

  test('closes a socket when readiness fails before open', async () => {
    const { socket, live } = makeTestSocket()

    const exit = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const acquisition = yield* Effect.forkChild(acquireChatSocket, {
            startImmediately: true,
          })

          yield* Deferred.await(socket.readinessStarted)
          socket.emit('error')
          return yield* Fiber.await(acquisition)
        }).pipe(Effect.provide(live)),
      ),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expectSocketClosed(socket)
  })

  test('closes a socket when readiness times out', async () => {
    const { socket, live } = makeTestSocket()

    const exit = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const acquisition = yield* Effect.forkChild(acquireChatSocket, {
            startImmediately: true,
          })

          yield* Deferred.await(socket.readinessStarted)
          yield* TestClock.adjust('5 seconds')
          return yield* Fiber.await(acquisition)
        }).pipe(Effect.provide(Layer.mergeAll(live, TestClock.layer()))),
      ),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expectSocketClosed(socket)
  })

  test('keeps an open socket alive until its resource scope closes', async () => {
    const { socket, live } = makeTestSocket()

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const acquisition = yield* Effect.forkChild(acquireChatSocket, {
            startImmediately: true,
          })

          yield* Deferred.await(socket.readinessStarted)
          socket.emit('open')
          expect(yield* Fiber.join(acquisition)).toBe(socket)
          expect(socket.closeCount).toBe(0)
          expect(socket.readyState).toBe(OPEN_READY_STATE)
          expectReadinessListenersRemoved(socket)
        }).pipe(Effect.provide(live)),
      ),
    )

    expectSocketClosed(socket)
  })
})
