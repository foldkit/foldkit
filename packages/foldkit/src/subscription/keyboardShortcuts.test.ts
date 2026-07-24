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

type Message = { readonly _tag: string }
const message = (tag: string) => (): Message => ({ _tag: tag })

const press = (
  init: KeyboardEventInit,
  target: EventTarget = document,
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('keyboardShortcuts', () => {
  it('emits the Message bound to a single key', async () => {
    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [{ keys: '/', message: message('OpenedPalette') }],
        }),
        received,
      ),
    )

    await tick()
    press({ key: '/' })
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([{ _tag: 'OpenedPalette' }])
  })

  it('emits the Message bound to a mod combo and not the bare key', async () => {
    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [{ keys: 'mod+k', message: message('ToggledPalette') }],
        }),
        received,
      ),
    )

    await tick()
    press({ key: 'k' })
    press({ key: 'k', metaKey: true })
    press({ key: 'k', ctrlKey: true })
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([
      { _tag: 'ToggledPalette' },
      { _tag: 'ToggledPalette' },
    ])
  })

  it('emits the Message bound to a two-key chord', async () => {
    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [
            { chord: ['g', 'l'], message: message('NavigatedToList') },
          ],
        }),
        received,
      ),
    )

    await tick()
    press({ key: 'g' })
    press({ key: 'l' })
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([{ _tag: 'NavigatedToList' }])
  })

  it('cancels a chord when the second key does not match', async () => {
    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [
            { chord: ['g', 'l'], message: message('NavigatedToList') },
            { keys: '/', message: message('OpenedPalette') },
          ],
        }),
        received,
      ),
    )

    await tick()
    press({ key: 'g' })
    press({ key: '/' })
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([{ _tag: 'OpenedPalette' }])
  })

  it('suppresses shortcuts while typing in a field by default', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [{ keys: '/', message: message('OpenedPalette') }],
        }),
        received,
      ),
    )

    await tick()
    press({ key: '/' }, input)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([])
  })

  it('fires a whileTyping Allow binding even while in a field', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [
            {
              keys: 'Escape',
              message: message('ClosedPalette'),
              whileTyping: 'Allow',
            },
          ],
        }),
        received,
      ),
    )

    await tick()
    press({ key: 'Escape' }, input)
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([{ _tag: 'ClosedPalette' }])
  })

  it('emits nothing for an unbound key', async () => {
    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [{ keys: '/', message: message('OpenedPalette') }],
        }),
        received,
      ),
    )

    await tick()
    press({ key: 'z' })
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(received).toEqual([])
  })

  it('calls preventDefault for a matched binding but not an unbound key', async () => {
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [{ keys: '/', message: message('OpenedPalette') }],
        }),
        [],
      ),
    )

    await tick()
    const matched = press({ key: '/' })
    const unbound = press({ key: 'z' })
    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))

    expect(matched.defaultPrevented).toBe(true)
    expect(unbound.defaultPrevented).toBe(false)
  })

  it('does not fire once the scope has closed', async () => {
    const received: Array<Message> = []
    const fiber = Effect.runFork(
      drain(
        keyboardShortcuts<Message>({
          bindings: [{ keys: '/', message: message('OpenedPalette') }],
        }),
        received,
      ),
    )

    await tick()
    await Effect.runPromise(Fiber.interrupt(fiber))
    press({ key: '/' })
    await tick()

    expect(received).toEqual([])
  })
})
