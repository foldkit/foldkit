import { Effect, Fiber, Option, Stream } from 'effect'
import { describe, expect, it } from 'vitest'

import { fromEvent, fromEventFilterMap } from './fromEvent.js'

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

const drain = <Message>(
  stream: Stream.Stream<Message>,
  sink: Array<Message>,
): Effect.Effect<void> =>
  Stream.runForEach(stream, message =>
    Effect.sync(() => {
      sink.push(message)
    }),
  )

describe('fromEvent', () => {
  it('emits a Message for every dispatched event', async () => {
    const target = new EventTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent<CustomEvent<string>, string>({
          target,
          type: 'ping',
          toMessage: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a', 'b'])
  })

  it('removes the listener when the scope closes', async () => {
    const target = new EventTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent<CustomEvent<string>, string>({
          target,
          type: 'ping',
          toMessage: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()

    expect(received).toEqual(['a'])
  })

  it('resolves a thunk target inside the acquire Effect', async () => {
    const target = new EventTarget()
    let isResolved = false
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent<CustomEvent<string>, string>({
          target: () => {
            isResolved = true
            return target
          },
          type: 'ping',
          toMessage: event => event.detail,
        }),
        received,
      ),
    )

    await tick()
    expect(isResolved).toBe(true)
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })

  it('forwards listener options', async () => {
    const target = new EventTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEvent<CustomEvent<string>, string>({
          target,
          type: 'ping',
          toMessage: event => event.detail,
          options: { once: true },
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a'])
  })
})

describe('fromEventFilterMap', () => {
  it('emits only for events the mapper keeps and skips the rest', async () => {
    const target = new EventTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap<CustomEvent<string>, string>({
          target,
          type: 'ping',
          toMessage: event =>
            event.detail === 'skip' ? Option.none() : Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'skip' }))
    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['a', 'b'])
  })

  it('removes the listener when the scope closes', async () => {
    const target = new EventTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap<CustomEvent<string>, string>({
          target,
          type: 'ping',
          toMessage: event => Option.some(event.detail),
        }),
        received,
      ),
    )

    await tick()
    target.dispatchEvent(new CustomEvent('ping', { detail: 'a' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    target.dispatchEvent(new CustomEvent('ping', { detail: 'b' }))
    await tick()

    expect(received).toEqual(['a'])
  })

  it('runs preventDefault synchronously inside the mapper', async () => {
    const target = new EventTarget()
    const received: Array<string> = []

    const fiber = Effect.runFork(
      drain(
        fromEventFilterMap<CustomEvent<string>, string>({
          target,
          type: 'ping',
          toMessage: event => {
            event.preventDefault()
            return Option.some(event.detail)
          },
        }),
        received,
      ),
    )

    await tick()
    const event = new CustomEvent('ping', { detail: 'a', cancelable: true })
    target.dispatchEvent(event)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(event.defaultPrevented).toBe(true)
    expect(received).toEqual(['a'])
  })
})
