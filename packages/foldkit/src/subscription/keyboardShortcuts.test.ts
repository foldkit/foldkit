import { Duration, Effect, Fiber, Schema, Stream } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import {
  type KeyboardShortcutsConfig,
  keyboardShortcuts,
} from './keyboardShortcuts.js'

const Message = defineMessageUnion({
  PressedShortcut: { name: Schema.String },
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

const toMessage = (name: string) => (): Message =>
  Message.PressedShortcut({ name })

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

const start = async (config: KeyboardShortcutsConfig<Message>) => {
  const received: Array<Message> = []
  const fiber = Effect.runFork(drain(keyboardShortcuts(config), received))
  await tick()
  return { fiber, received }
}

const stop = (fiber: Fiber.Fiber<void>): Promise<unknown> =>
  Effect.runPromise(Fiber.interrupt(fiber))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('keyboardShortcuts', () => {
  it('emits the Message for a matching one-press shortcut', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: '/',
          toMessage: event =>
            Message.PressedShortcut({ name: `Pressed${event.key}` }),
        },
      ],
    })

    const matched = press({ key: '/' })
    const unbound = press({ key: 'Z' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([Message.PressedShortcut({ name: 'Pressed/' })])
    expect(matched.defaultPrevented).toBe(true)
    expect(unbound.defaultPrevented).toBe(false)
  })

  it('matches modifiers exactly and resolves Mod to the configured platform key', async () => {
    const { fiber, received } = await start({
      modKey: 'Meta',
      bindings: [
        {
          shortcut: 'Mod+K',
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
      Message.PressedShortcut({ name: 'PressedSearchShortcut' }),
    ])
  })

  it('accepts modifier aliases and key aliases', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: 'Ctrl+Option+Shift+Plus',
          toMessage: toMessage('PressedAliasedShortcut'),
        },
        {
          shortcut: 'Space',
          toMessage: toMessage('PressedSpace'),
        },
      ],
    })

    press({ key: '+', ctrlKey: true, altKey: true, shiftKey: true })
    press({ key: ' ' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedShortcut({ name: 'PressedAliasedShortcut' }),
      Message.PressedShortcut({ name: 'PressedSpace' }),
    ])
  })

  it('matches arbitrary-length sequences with the same grammar at every step', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: ['G', 'Shift+G', 'Control+Enter'],
          toMessage: toMessage('PressedSequence'),
        },
      ],
    })

    press({ key: 'g' })
    press({ key: 'G', shiftKey: true })
    press({ key: 'Enter', ctrlKey: true })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedShortcut({ name: 'PressedSequence' }),
    ])
  })

  it('supports sequences that share a prefix', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
        {
          shortcut: ['G', 'P'],
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
      Message.PressedShortcut({ name: 'PressedHomeSequence' }),
      Message.PressedShortcut({ name: 'PressedPeopleSequence' }),
    ])
  })

  it('re-evaluates a sequence mismatch as a fresh press', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: ['G', 'H'],
          toMessage: toMessage('PressedHomeSequence'),
        },
        {
          shortcut: '/',
          toMessage: toMessage('PressedPaletteShortcut'),
        },
      ],
    })

    press({ key: 'g' })
    press({ key: '/' })
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedShortcut({ name: 'PressedPaletteShortcut' }),
    ])
  })

  it('expires an incomplete sequence', async () => {
    const { fiber, received } = await start({
      sequenceTimeout: Duration.millis(5),
      bindings: [
        {
          shortcut: ['G', 'H'],
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
          shortcut: ['G', 'H'],
          toMessage: toMessage('PressedPreventedSequence'),
        },
        {
          shortcut: ['N', 'P'],
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

  it('suppresses shortcuts from editable composed paths by default', async () => {
    const input = document.createElement('input')
    const editor = document.createElement('div')
    const editorChild = document.createElement('span')
    editor.contentEditable = 'true'
    editor.appendChild(editorChild)
    document.body.append(input, editor)

    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: '/',
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

  it('allows an opted-in shortcut from an editable element', async () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: 'Escape',
          whileTyping: 'Allow',
          toMessage: toMessage('PressedEscape'),
        },
      ],
    })

    press({ key: 'Escape' }, input)
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedShortcut({ name: 'PressedEscape' }),
    ])
  })

  it('defers to an element that already prevented the keyboard event', async () => {
    const button = document.createElement('button')
    button.addEventListener('keydown', event => event.preventDefault())
    document.body.appendChild(button)

    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: '/',
          toMessage: toMessage('PressedPaletteShortcut'),
        },
        {
          shortcut: ['G', 'H'],
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
          shortcut: ['G', 'H'],
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
          shortcut: 'A',
          toMessage: toMessage('PressedIgnoredRepeat'),
        },
        {
          shortcut: 'B',
          whenRepeated: 'Allow',
          toMessage: toMessage('PressedAllowedRepeat'),
        },
        {
          shortcut: ['G', 'H'],
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
      Message.PressedShortcut({ name: 'PressedAllowedRepeat' }),
      Message.PressedShortcut({ name: 'PressedSequence' }),
    ])
  })

  it('omits disabled bindings', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: '/',
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

  it('clears a pending sequence when the window loses focus', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          shortcut: ['G', 'H'],
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
          shortcut: '/',
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
      Message.PressedShortcut({ name: 'PressedPaletteShortcut' }),
    ])
  })

  it('rejects malformed and ambiguous binding tables', () => {
    expect(() =>
      keyboardShortcuts<Message>({
        bindings: [
          {
            shortcut: 'Control+K',
            toMessage: toMessage('PressedFirst'),
          },
          {
            shortcut: 'Ctrl+K',
            toMessage: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/duplicates/)

    expect(() =>
      keyboardShortcuts<Message>({
        modKey: 'Control',
        bindings: [
          { shortcut: 'Mod+K', toMessage: toMessage('PressedFirst') },
          { shortcut: 'Control+K', toMessage: toMessage('PressedSecond') },
        ],
      }),
    ).toThrowError(/duplicates/)

    expect(() =>
      keyboardShortcuts<Message>({
        modKey: 'Control',
        bindings: [
          { shortcut: 'Mod+K', toMessage: toMessage('PressedFirst') },
          { shortcut: 'Meta+K', toMessage: toMessage('PressedSecond') },
        ],
      }),
    ).not.toThrow()

    expect(() =>
      keyboardShortcuts<Message>({
        bindings: [
          { shortcut: 'G', toMessage: toMessage('PressedFirst') },
          {
            shortcut: ['G', 'H'],
            toMessage: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/sequence prefix/)

    expect(() =>
      keyboardShortcuts<Message>({
        bindings: [
          {
            shortcut: ['G', 'H'],
            toMessage: toMessage('PressedFirst'),
          },
          {
            shortcut: ['G', 'P'],
            preventDefault: false,
            toMessage: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/same preventDefault/)

    expect(() =>
      keyboardShortcuts<Message>({
        bindings: [
          {
            shortcut: 'Control++',
            toMessage: toMessage('PressedMalformed'),
          },
        ],
      }),
    ).toThrowError(/use "Plus"/)

    expect(() =>
      keyboardShortcuts<Message>({
        sequenceTimeout: Duration.zero,
        bindings: [],
      }),
    ).toThrowError(/above zero/)
  })
})
