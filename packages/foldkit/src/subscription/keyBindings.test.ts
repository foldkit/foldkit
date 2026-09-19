import { Duration, Effect, Fiber, Schema, Stream } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { type KeyBindingsConfig, keyBindings } from './keyBindings.js'

const Message = defineMessageUnion({
  PressedKeys: { name: Schema.String },
})

type Message = typeof Message.Type

const tick = (milliseconds = 0): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

const drain = <Message>(
  stream: Stream.Stream<Message>,
  sink: Array<Message>,
): Effect.Effect<void> =>
  Stream.runForEach(stream, message =>
    Effect.sync(() => {
      sink.push(message)
    }),
  )

const toMessage = (name: string) => (): Message => Message.PressedKeys({ name })

const press = (
  init: KeyboardEventInit,
  target: EventTarget = document,
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

const start = async (config: KeyBindingsConfig<Message>) => {
  const received: Array<Message> = []
  const fiber = Effect.runFork(drain(keyBindings(config), received))
  await tick()
  return { fiber, received }
}

const stop = (fiber: Fiber.Fiber<void>): Promise<unknown> =>
  Effect.runPromise(Fiber.interrupt(fiber))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('keyBindings', () => {
  it('emits the Message for a matching one-press binding', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: '/',
          toMessage: event =>
            Message.PressedKeys({ name: `Pressed${event.key}` }),
        },
      ],
    })

    const matched = press({ key: '/' })
    const unbound = press({ key: 'Z' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([Message.PressedKeys({ name: 'Pressed/' })])
    expect(matched.defaultPrevented).toBe(true)
    expect(unbound.defaultPrevented).toBe(false)
  })

  it('matches modifiers exactly and resolves Mod to the configured platform key', async () => {
    const { fiber, received } = await start({
      modKey: 'Meta',
      bindings: [
        {
          keys: 'Mod+K',
          toMessage: toMessage('PressedSearchShortcut'),
        },
      ],
    })

    press({ key: 'k' })
    press({ key: 'k', ctrlKey: true })
    press({ key: 'k', metaKey: true, shiftKey: true })
    press({ key: 'k', metaKey: true })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedSearchShortcut' }),
    ])
  })

  it('matches canonical modifiers and special key spellings', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: 'Control+Alt+Shift+Plus',
          toMessage: toMessage('PressedModifiedPlus'),
        },
        {
          keys: 'Space',
          toMessage: toMessage('PressedSpace'),
        },
      ],
    })

    press({ key: '+', ctrlKey: true, altKey: true, shiftKey: true })
    press({ key: ' ' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedModifiedPlus' }),
      Message.PressedKeys({ name: 'PressedSpace' }),
    ])
  })

  it('rejects non-canonical modifier names', () => {
    for (const modifier of ['Ctrl', 'Cmd', 'Command', 'Option']) {
      for (const keyPress of [`${modifier}+K`, modifier, `Shift+${modifier}`]) {
        expect(() =>
          keyBindings<Message>({
            bindings: [
              {
                keys: keyPress,
                toMessage: toMessage('PressedShortcut'),
              },
            ],
          }),
        ).toThrowError(/unknown modifier/)
      }
    }
  })

  it('matches arbitrary-length sequences with the same grammar at every step', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: ['G', 'Shift+G', 'Control+Enter'],
          toMessage: toMessage('PressedSequence'),
        },
      ],
    })

    press({ key: 'g' })
    press({ key: 'G', shiftKey: true })
    press({ key: 'Enter', ctrlKey: true })
    await tick()
    await stop(fiber)

    expect(received).toEqual([Message.PressedKeys({ name: 'PressedSequence' })])
  })

  it('supports sequences that share a prefix', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
        {
          keys: ['G', 'P'],
          toMessage: toMessage('PressedPeopleSequence'),
        },
      ],
    })

    press({ key: 'g' })
    press({ key: 'h' })
    press({ key: 'g' })
    press({ key: 'p' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedHomeSequence' }),
      Message.PressedKeys({ name: 'PressedPeopleSequence' }),
    ])
  })

  it('shares sequence prefixes after resolving Mod to the configured key', async () => {
    const { fiber, received } = await start({
      modKey: 'Control',
      bindings: [
        {
          keys: ['Mod+K', 'A'],
          toMessage: toMessage('PressedModSequence'),
        },
        {
          keys: ['Control+K', 'B'],
          toMessage: toMessage('PressedControlSequence'),
        },
      ],
    })

    press({ key: 'k', ctrlKey: true })
    press({ key: 'a' })
    press({ key: 'k', ctrlKey: true })
    press({ key: 'b' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedModSequence' }),
      Message.PressedKeys({ name: 'PressedControlSequence' }),
    ])
  })

  it('re-evaluates a sequence mismatch as a fresh press', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
        {
          keys: '/',
          toMessage: toMessage('PressedPaletteShortcut'),
        },
      ],
    })

    press({ key: 'g' })
    press({ key: '/' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedPaletteShortcut' }),
    ])
  })

  it('expires an incomplete sequence', async () => {
    const { fiber, received } = await start({
      sequenceTimeout: Duration.millis(5),
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
      ],
    })

    press({ key: 'g' })
    await tick(15)
    press({ key: 'h' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([])
  })

  it('applies preventDefault consistently across a matched sequence', async () => {
    const { fiber } = await start({
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedPreventedSequence'),
        },
        {
          keys: ['N', 'P'],
          preventDefault: false,
          toMessage: toMessage('PressedUnpreventedSequence'),
        },
      ],
    })

    const preventedFirst = press({ key: 'g' })
    const preventedSecond = press({ key: 'h' })
    const unpreventedFirst = press({ key: 'n' })
    const unpreventedSecond = press({ key: 'p' })
    await stop(fiber)

    expect(preventedFirst.defaultPrevented).toBe(true)
    expect(preventedSecond.defaultPrevented).toBe(true)
    expect(unpreventedFirst.defaultPrevented).toBe(false)
    expect(unpreventedSecond.defaultPrevented).toBe(false)
  })

  it('suppresses bindings from editable composed paths by default', async () => {
    const input = document.createElement('input')
    const editor = document.createElement('div')
    const editorChild = document.createElement('span')
    editor.contentEditable = 'true'
    editor.appendChild(editorChild)
    document.body.append(input, editor)

    const { fiber, received } = await start({
      bindings: [
        {
          keys: '/',
          toMessage: toMessage('PressedPaletteShortcut'),
        },
      ],
    })

    press({ key: '/' }, input)
    press({ key: '/' }, editorChild)
    await tick()
    await stop(fiber)

    expect(received).toEqual([])
  })

  it('allows an opted-in binding from an editable element', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    const { fiber, received } = await start({
      bindings: [
        {
          keys: 'Escape',
          whileTyping: 'Allow',
          toMessage: toMessage('PressedEscape'),
        },
      ],
    })

    press({ key: 'Escape' }, input)
    await tick()
    await stop(fiber)

    expect(received).toEqual([Message.PressedKeys({ name: 'PressedEscape' })])
  })

  it('keeps a sequence limited to bindings eligible on its first press', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    const { fiber, received } = await start({
      bindings: [
        {
          keys: ['G', 'H'],
          whileTyping: 'Allow',
          toMessage: toMessage('PressedAllowedSequence'),
        },
        {
          keys: ['G', 'P'],
          toMessage: toMessage('PressedSuppressedSequence'),
        },
      ],
    })

    press({ key: 'g' }, input)
    press({ key: 'p' })
    press({ key: 'g' }, input)
    press({ key: 'h' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedAllowedSequence' }),
    ])
  })

  it('defers to an element that already prevented the keyboard event', async () => {
    const button = document.createElement('button')
    button.addEventListener('keydown', event => event.preventDefault())
    document.body.appendChild(button)

    const { fiber, received } = await start({
      bindings: [
        {
          keys: '/',
          toMessage: toMessage('PressedPaletteShortcut'),
        },
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
      ],
    })

    press({ key: 'g' })
    const prevented = press({ key: '/' }, button)
    press({ key: 'h' })
    await tick()
    await stop(fiber)

    expect(prevented.defaultPrevented).toBe(true)
    expect(received).toEqual([])
  })

  it('ignores IME composition and clears a pending sequence', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
      ],
    })

    press({ key: 'g' })
    press({ key: 'h', isComposing: true })
    press({ key: 'h' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([])
  })

  it('ignores repeated presses by default and supports one-press opt-in', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: 'A',
          toMessage: toMessage('PressedIgnoredRepeat'),
        },
        {
          keys: 'B',
          whenRepeated: 'Allow',
          toMessage: toMessage('PressedAllowedRepeat'),
        },
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedSequence'),
        },
      ],
    })

    press({ key: 'a', repeat: true })
    press({ key: 'b', repeat: true })
    press({ key: 'g' })
    press({ key: 'g', repeat: true })
    press({ key: 'h' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedAllowedRepeat' }),
      Message.PressedKeys({ name: 'PressedSequence' }),
    ])
  })

  it('omits disabled bindings', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: '/',
          isEnabled: false,
          toMessage: toMessage('PressedDisabledShortcut'),
        },
      ],
    })

    press({ key: '/' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([])
  })

  it('validates and listens with only the enabled bindings', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: 'Escape',
          isEnabled: false,
          toMessage: toMessage('PressedDisabledEscape'),
        },
        {
          keys: 'Escape',
          isEnabled: true,
          toMessage: toMessage('PressedEnabledEscape'),
        },
      ],
    })

    press({ key: 'Escape' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedEnabledEscape' }),
    ])
  })

  it('clears a pending sequence when the window loses focus', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
      ],
    })

    press({ key: 'g' })
    window.dispatchEvent(new Event('blur'))
    press({ key: 'h' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([])
  })

  it('starts each Stream scope without a pending sequence', async () => {
    const config: KeyBindingsConfig<Message> = {
      bindings: [
        {
          keys: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
      ],
    }
    const firstScope = await start(config)

    press({ key: 'g' })
    await stop(firstScope.fiber)

    const secondScope = await start(config)
    press({ key: 'h' })
    await tick()
    press({ key: 'g' })
    press({ key: 'h' })
    await tick()
    await stop(secondScope.fiber)

    expect(firstScope.received).toEqual([])
    expect(secondScope.received).toEqual([
      Message.PressedKeys({ name: 'PressedHomeSequence' }),
    ])
  })

  it('resolves a thunk target at acquisition and removes its listener on teardown', async () => {
    const target = new EventTarget()
    let isResolved = false
    const { fiber, received } = await start({
      target: () => {
        isResolved = true
        return target
      },
      bindings: [
        {
          keys: '/',
          toMessage: toMessage('PressedPaletteShortcut'),
        },
      ],
    })

    expect(isResolved).toBe(true)
    press({ key: '/' }, target)
    await tick()
    await stop(fiber)
    press({ key: '/' }, target)
    await tick()

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedPaletteShortcut' }),
    ])
  })

  it('rejects malformed and ambiguous binding tables', () => {
    expect(() =>
      keyBindings<Message>({
        bindings: [
          {
            keys: 'Control+K',
            toMessage: toMessage('PressedFirst'),
          },
          {
            keys: 'Control+K',
            toMessage: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/duplicates/)

    expect(() =>
      keyBindings<Message>({
        modKey: 'Control',
        bindings: [
          { keys: 'Mod+K', toMessage: toMessage('PressedFirst') },
          { keys: 'Control+K', toMessage: toMessage('PressedSecond') },
        ],
      }),
    ).toThrowError(/duplicates/)

    expect(() =>
      keyBindings<Message>({
        modKey: 'Control',
        bindings: [
          { keys: 'Mod+K', toMessage: toMessage('PressedFirst') },
          { keys: 'Meta+K', toMessage: toMessage('PressedSecond') },
        ],
      }),
    ).not.toThrow()

    expect(() =>
      keyBindings<Message>({
        bindings: [
          { keys: 'G', toMessage: toMessage('PressedFirst') },
          {
            keys: ['G', 'H'],
            toMessage: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/sequence prefix/)

    expect(() =>
      keyBindings<Message>({
        bindings: [
          {
            keys: ['G', 'H'],
            toMessage: toMessage('PressedFirst'),
          },
          {
            keys: ['G', 'P'],
            preventDefault: false,
            toMessage: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/same preventDefault/)

    expect(() =>
      keyBindings<Message>({
        bindings: [
          {
            keys: 'Control++',
            toMessage: toMessage('PressedMalformed'),
          },
        ],
      }),
    ).toThrowError(/use "Plus"/)

    expect(() =>
      keyBindings<Message>({
        bindings: [
          {
            keys: 'CapsLock',
            toMessage: toMessage('PressedModifierKey'),
          },
        ],
      }),
    ).toThrowError(/non-modifier/)

    expect(() =>
      keyBindings<Message>({
        sequenceTimeout: Duration.zero,
        bindings: [],
      }),
    ).toThrowError(/above zero/)
  })
})
