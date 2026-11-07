import { Array, Cause, Duration, Effect, Exit, Fiber, Option } from 'effect'
import { Socket } from 'effect/socket'
import { TestClock } from 'effect/testing'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { openWebSocketConnection } from './webSocketConnection'

type EventType = Parameters<Socket.WebSocketLike['addEventListener']>[0]
type Listener = Parameters<Socket.WebSocketLike['addEventListener']>[1]

const CONNECTING = 0
const OPEN = 1
const CLOSED = 3
const OPEN_TIMEOUT = Duration.seconds(5)

class TestWebSocket implements Socket.WebSocketLike {
  readyState: number
  closeCount = 0
  readonly sentFrames: Array<string | Uint8Array<ArrayBuffer>> = []
  readonly listeners = new Map<
    EventType,
    Map<Listener, Readonly<{ isOnce: boolean }>>
  >()

  constructor(readyState = CONNECTING) {
    this.readyState = readyState
  }

  addEventListener(
    type: EventType,
    listener: Listener,
    options?: Readonly<{ once?: boolean }>,
  ) {
    const listeners = this.listeners.get(type) ?? new Map()
    listeners.set(listener, { isOnce: options?.once ?? false })
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: EventType, listener: Listener) {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: EventType, event: Socket.WebSocketEvent = {}) {
    const listeners = this.listeners.get(type)

    if (listeners === undefined) {
      return
    }

    for (const [listener, { isOnce }] of Array.fromIterable(listeners)) {
      if (isOnce) {
        listeners.delete(listener)
      }

      listener(event)
    }
  }

  open() {
    this.readyState = OPEN
    this.emit('open')
  }

  close() {
    this.closeCount += 1
    this.readyState = CLOSED
    this.emit('close', { code: 1000 })
  }

  send(data: string | Uint8Array<ArrayBuffer>) {
    this.sentFrames.push(data)
  }

  listenerCount(type: EventType) {
    return this.listeners.get(type)?.size ?? 0
  }
}

const openConnection = (socket: TestWebSocket) =>
  openWebSocketConnection(() => socket, 'wss://chat.test', OPEN_TIMEOUT)

const failureReason = (exit: Exit.Exit<unknown, Socket.SocketError>) => {
  if (Exit.isSuccess(exit)) {
    throw new Error('Expected connection failure')
  }

  return Option.getOrThrow(Cause.findErrorOption(exit.cause)).reason
}

describe('WebSocket connection acquisition', () => {
  it.effect(
    'waits for readiness and keeps the reader active after opening',
    () =>
      Effect.gen(function* () {
        const socket = new TestWebSocket()

        yield* Effect.scoped(
          Effect.gen(function* () {
            const pendingConnection = yield* Effect.forkScoped(
              openConnection(socket),
            )
            yield* Effect.yieldNow

            expect(socket.listenerCount('open')).toBe(1)
            expect(socket.closeCount).toBe(0)

            socket.open()
            const connection = yield* Fiber.join(pendingConnection)

            expect(socket.listenerCount('open')).toBe(0)
            expect(socket.listenerCount('message')).toBe(1)

            yield* connection.writer.write('hello')
            socket.emit('message', { data: 'reply' })

            expect(yield* connection.reader.pull).toEqual(['reply'])
            expect(socket.sentFrames).toEqual(['hello'])
            expect(socket.closeCount).toBe(0)
          }),
        )

        expect(socket.closeCount).toBe(1)
        expect(socket.listenerCount('open')).toBe(0)
        expect(socket.listenerCount('message')).toBe(0)
        expect(socket.listenerCount('close')).toBe(0)
      }),
  )

  it.effect(
    'releases a failed partial connection and ignores a competing open',
    () =>
      Effect.gen(function* () {
        const socket = new TestWebSocket()
        const pendingConnection = yield* Effect.forkChild(
          openConnection(socket).pipe(Effect.scoped, Effect.exit),
        )
        yield* Effect.yieldNow

        socket.emit('error')
        socket.open()
        const connection = yield* Fiber.join(pendingConnection)

        expect(failureReason(connection)._tag).toBe('SocketOpenError')
        expect(socket.closeCount).toBe(1)
        expect(socket.listenerCount('open')).toBe(0)
        expect(socket.listenerCount('message')).toBe(0)
        expect(socket.listenerCount('close')).toBe(0)
      }),
  )

  it.effect('times out and releases the partially opened socket', () =>
    Effect.gen(function* () {
      const socket = new TestWebSocket()
      const pendingConnection = yield* Effect.forkChild(
        openConnection(socket).pipe(Effect.scoped, Effect.exit),
      )
      yield* Effect.yieldNow
      yield* TestClock.adjust(OPEN_TIMEOUT)

      const connection = yield* Fiber.join(pendingConnection)
      expect(failureReason(connection)).toMatchObject({
        _tag: 'SocketOpenError',
        kind: 'Timeout',
      })
      expect(socket.closeCount).toBe(1)
      expect(socket.listenerCount('open')).toBe(0)
      expect(socket.listenerCount('message')).toBe(0)
      expect(socket.listenerCount('close')).toBe(0)
    }),
  )

  it.effect('releases a connection interrupted before readiness', () =>
    Effect.gen(function* () {
      const socket = new TestWebSocket()
      const pendingConnection = yield* Effect.forkChild(
        openConnection(socket).pipe(Effect.scoped),
      )
      yield* Effect.yieldNow
      yield* Fiber.interrupt(pendingConnection)

      expect(socket.closeCount).toBe(1)
      expect(socket.listenerCount('open')).toBe(0)
      expect(socket.listenerCount('message')).toBe(0)
      expect(socket.listenerCount('close')).toBe(0)
    }),
  )

  it.effect(
    'accepts an already-open connection without waiting for another event',
    () =>
      Effect.gen(function* () {
        const socket = new TestWebSocket(OPEN)

        yield* Effect.scoped(
          Effect.gen(function* () {
            const connection = yield* openConnection(socket)

            expect(socket.listenerCount('open')).toBe(0)
            yield* connection.writer.write('hello')
            expect(socket.sentFrames).toEqual(['hello'])
          }),
        )

        expect(socket.closeCount).toBe(1)
      }),
  )

  it.effect('rejects an already-closed connection and releases its scope', () =>
    Effect.gen(function* () {
      const socket = new TestWebSocket(CLOSED)
      const connection = yield* openConnection(socket).pipe(
        Effect.scoped,
        Effect.exit,
      )

      expect(failureReason(connection)._tag).toBe('SocketCloseError')
      expect(socket.closeCount).toBe(1)
      expect(socket.listenerCount('open')).toBe(0)
      expect(socket.listenerCount('message')).toBe(0)
      expect(socket.listenerCount('close')).toBe(0)
    }),
  )
})
