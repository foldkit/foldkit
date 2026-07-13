import { Effect, Fiber, Stream } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { keyboardShortcuts } from './keyboardShortcuts.js'

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

const keydown = (init: KeyboardEventInit): KeyboardEvent =>
  new KeyboardEvent('keydown', { cancelable: true, ...init })

const focusInput = (): HTMLInputElement => {
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.focus()
  return input
}

afterEach(() => {
  document.body.replaceChildren()
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
})

describe('keyboardShortcuts', () => {
  it('emits the Message for a bare key with no modifier', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ keys: 'c', message: () => 'Created' }],
        }),
        received,
      ),
    )

    await tick()
    document.dispatchEvent(keydown({ key: 'c' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['Created'])
  })

  it('does not fire a bare key when a modifier is held', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ keys: 'c', message: () => 'Created' }],
        }),
        received,
      ),
    )

    await tick()
    document.dispatchEvent(keydown({ key: 'c', metaKey: true }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([])
  })

  it('matches a mod combo on either metaKey or ctrlKey', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ keys: 'mod+k', message: () => 'Toggled' }],
        }),
        received,
      ),
    )

    await tick()
    document.dispatchEvent(keydown({ key: 'k', metaKey: true }))
    document.dispatchEvent(keydown({ key: 'k', ctrlKey: true }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['Toggled', 'Toggled'])
  })

  it('calls preventDefault for a mod combo but not for a bare key', async () => {
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [
            { keys: 'mod+k', message: () => 'Toggled' },
            { keys: '/', message: () => 'Slash' },
          ],
        }),
        [],
      ),
    )

    await tick()
    const modEvent = keydown({ key: 'k', metaKey: true })
    const bareEvent = keydown({ key: '/' })
    document.dispatchEvent(modEvent)
    document.dispatchEvent(bareEvent)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(modEvent.defaultPrevented).toBe(true)
    expect(bareEvent.defaultPrevented).toBe(false)
  })

  it('honors a per-binding preventDefault override', async () => {
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [
            { keys: '/', message: () => 'Slash', preventDefault: true },
          ],
        }),
        [],
      ),
    )

    await tick()
    const event = keydown({ key: '/' })
    document.dispatchEvent(event)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(event.defaultPrevented).toBe(true)
  })

  it('suppresses a bare key while typing in a field by default', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ keys: 'c', message: () => 'Created' }],
        }),
        received,
      ),
    )

    await tick()
    focusInput()
    document.dispatchEvent(keydown({ key: 'c' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([])
  })

  it('fires a binding while typing when whileTyping is Allow', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [
            { keys: 'mod+k', message: () => 'Toggled', whileTyping: 'Allow' },
          ],
        }),
        received,
      ),
    )

    await tick()
    focusInput()
    document.dispatchEvent(keydown({ key: 'k', metaKey: true }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['Toggled'])
  })

  it('resolves a two-key chord and emits only on the second key', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ chord: ['g', 'l'], message: () => 'NavigatedList' }],
        }),
        received,
      ),
    )

    await tick()
    document.dispatchEvent(keydown({ key: 'g' }))
    expect(received).toEqual([])
    document.dispatchEvent(keydown({ key: 'l' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual(['NavigatedList'])
  })

  it('clears a pending chord prefix when the second key does not match', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ chord: ['g', 'l'], message: () => 'NavigatedList' }],
        }),
        received,
      ),
    )

    await tick()
    document.dispatchEvent(keydown({ key: 'g' }))
    document.dispatchEvent(keydown({ key: 'x' }))
    document.dispatchEvent(keydown({ key: 'l' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([])
  })

  it('does not arm a chord prefix while typing in a field', async () => {
    const received: Array<string> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<string>({
          target: document,
          bindings: [{ chord: ['g', 'l'], message: () => 'NavigatedList' }],
        }),
        received,
      ),
    )

    await tick()
    focusInput()
    document.dispatchEvent(keydown({ key: 'g' }))
    document.dispatchEvent(keydown({ key: 'l' }))
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([])
  })
})
