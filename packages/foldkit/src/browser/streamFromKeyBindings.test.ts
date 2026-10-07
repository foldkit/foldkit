import { Duration, Effect, Fiber, Predicate, Schema, Stream } from 'effect'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { make } from '../subscription/subscription.js'
import {
  type StreamFromKeyBindingsConfig,
  streamFromKeyBindings,
} from './streamFromKeyBindings.js'

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

// NOTE: iframe events need constructors from their own Window, whose type does
// not declare those constructors.
type WindowWithEventConstructors = Window &
  Readonly<{
    Event: typeof Event
    KeyboardEvent: typeof KeyboardEvent
  }>

const hasEventConstructors = (
  ownerWindow: Window,
): ownerWindow is WindowWithEventConstructors =>
  Predicate.hasProperty(ownerWindow, 'Event') &&
  Predicate.isFunction(ownerWindow.Event) &&
  Predicate.hasProperty(ownerWindow, 'KeyboardEvent') &&
  Predicate.isFunction(ownerWindow.KeyboardEvent)

const pressInWindow = (
  ownerWindow: WindowWithEventConstructors,
  init: KeyboardEventInit,
  target: EventTarget,
): KeyboardEvent => {
  const event = new ownerWindow.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

const start = async (config: StreamFromKeyBindingsConfig<Message>) => {
  const received: Array<Message> = []
  const fiber = Effect.runFork(drain(streamFromKeyBindings(config), received))
  await tick()
  return { fiber, received }
}

const stop = (fiber: Fiber.Fiber<void>): Promise<unknown> =>
  Effect.runPromise(Fiber.interrupt(fiber))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('streamFromKeyBindings', () => {
  it('infers its Stream output and checks the application Message at make', () => {
    if (false) {
      const rawEventStream = streamFromKeyBindings({
        bindings: [{ keys: 'Escape', mapEvent: event => event }],
      })

      expectTypeOf(rawEventStream).toEqualTypeOf<Stream.Stream<KeyboardEvent>>()

      make<{ isActive: boolean }, Message>()(entry => ({
        keyboard: entry(
          { isActive: Schema.Boolean },
          {
            modelToDependencies: model => ({ isActive: model.isActive }),
            // @ts-expect-error a raw KeyboardEvent is not an application Message
            dependenciesToStream: () => rawEventStream,
          },
        ),
      }))
    }
  })

  it('emits the Message for a matching one-press binding', async () => {
    const { fiber, received } = await start({
      bindings: [
        {
          keys: '/',
          mapEvent: event =>
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
          mapEvent: toMessage('PressedSearchShortcut'),
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
          mapEvent: toMessage('PressedModifiedPlus'),
        },
        {
          keys: 'Space',
          mapEvent: toMessage('PressedSpace'),
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
          streamFromKeyBindings<Message>({
            bindings: [
              {
                keys: keyPress,
                mapEvent: toMessage('PressedShortcut'),
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
          mapEvent: toMessage('PressedSequence'),
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
          mapEvent: toMessage('PressedHomeSequence'),
        },
        {
          keys: ['G', 'P'],
          mapEvent: toMessage('PressedPeopleSequence'),
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
          mapEvent: toMessage('PressedModSequence'),
        },
        {
          keys: ['Control+K', 'B'],
          mapEvent: toMessage('PressedControlSequence'),
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
          mapEvent: toMessage('PressedHomeSequence'),
        },
        {
          keys: '/',
          mapEvent: toMessage('PressedPaletteShortcut'),
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
          mapEvent: toMessage('PressedHomeSequence'),
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
          mapEvent: toMessage('PressedPreventedSequence'),
        },
        {
          keys: ['N', 'P'],
          preventDefault: false,
          mapEvent: toMessage('PressedUnpreventedSequence'),
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
          mapEvent: toMessage('PressedPaletteShortcut'),
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
          mapEvent: toMessage('PressedEscape'),
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
          mapEvent: toMessage('PressedAllowedSequence'),
        },
        {
          keys: ['G', 'P'],
          mapEvent: toMessage('PressedSuppressedSequence'),
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
          mapEvent: toMessage('PressedPaletteShortcut'),
        },
        {
          keys: ['G', 'H'],
          mapEvent: toMessage('PressedHomeSequence'),
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
          mapEvent: toMessage('PressedHomeSequence'),
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
          mapEvent: toMessage('PressedIgnoredRepeat'),
        },
        {
          keys: 'B',
          whenRepeated: 'Allow',
          mapEvent: toMessage('PressedAllowedRepeat'),
        },
        {
          keys: ['G', 'H'],
          mapEvent: toMessage('PressedSequence'),
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
          mapEvent: toMessage('PressedDisabledShortcut'),
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
          mapEvent: toMessage('PressedDisabledEscape'),
        },
        {
          keys: 'Escape',
          isEnabled: true,
          mapEvent: toMessage('PressedEnabledEscape'),
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
          mapEvent: toMessage('PressedHomeSequence'),
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
    const config: StreamFromKeyBindingsConfig<Message> = {
      bindings: [
        {
          keys: ['G', 'H'],
          mapEvent: toMessage('PressedHomeSequence'),
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
          mapEvent: toMessage('PressedPaletteShortcut'),
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

  it('ignores a partial owner document without event listeners', async () => {
    const target = new EventTarget()
    Object.defineProperty(target, 'ownerDocument', {
      value: {
        createElement: document.createElement.bind(document),
        defaultView: window,
        documentElement: document.documentElement,
      },
    })

    const { fiber, received } = await start({
      target,
      bindings: [
        {
          keys: ['G', 'H'],
          mapEvent: toMessage('PressedHomeSequence'),
        },
      ],
    })

    press({ key: 'g' }, target)
    document.dispatchEvent(new Event('visibilitychange'))
    press({ key: 'h' }, target)
    press({ key: 'g' }, target)
    press({ key: 'h' }, target)
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedHomeSequence' }),
    ])
  })

  it('does not use a partial Window to resolve Mod', async () => {
    const target = new EventTarget()
    const isParentApple = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
    const parentModKey = isParentApple ? 'Meta' : 'Control'
    const otherModKey = isParentApple ? 'Control' : 'Meta'
    Object.defineProperty(target, 'navigator', {
      value: { userAgent: isParentApple ? 'Windows' : 'Macintosh' },
    })

    const { fiber, received } = await start({
      target,
      bindings: [
        { keys: 'Mod+K', mapEvent: toMessage('PressedParentMod') },
        {
          keys: `${otherModKey}+K`,
          mapEvent: toMessage('PressedOtherMod'),
        },
      ],
    })

    press(
      {
        key: 'k',
        ...(parentModKey === 'Meta' ? { metaKey: true } : { ctrlKey: true }),
      },
      target,
    )
    press(
      {
        key: 'k',
        ...(otherModKey === 'Meta' ? { metaKey: true } : { ctrlKey: true }),
      },
      target,
    )
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedParentMod' }),
      Message.PressedKeys({ name: 'PressedOtherMod' }),
    ])
  })

  const verifyIframeTarget = async (
    selectTarget: (
      context: Readonly<{
        iframeDocument: Document
        iframeWindow: Window
        root: HTMLElement
      }>,
    ) => EventTarget,
  ): Promise<void> => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)

    const iframeDocument = iframe.contentDocument
    const iframeWindow = iframe.contentWindow
    if (iframeDocument === null || iframeWindow === null) {
      throw new Error('Expected the iframe to have a document and window')
    }
    if (!hasEventConstructors(iframeWindow)) {
      throw new Error('Expected the iframe window to have event constructors')
    }

    const root = iframeDocument.createElement('div')
    const input = iframeDocument.createElement('input')
    const button = iframeDocument.createElement('button')
    root.append(input, button)
    iframeDocument.body.appendChild(root)

    const { fiber, received } = await start({
      target: selectTarget({ iframeDocument, iframeWindow, root }),
      bindings: [
        {
          keys: '/',
          mapEvent: toMessage('PressedPaletteShortcut'),
        },
        {
          keys: ['G', 'H'],
          mapEvent: toMessage('PressedHomeSequence'),
        },
      ],
    })

    pressInWindow(iframeWindow, { key: '/' }, input)
    pressInWindow(iframeWindow, { key: '/' }, button)
    pressInWindow(iframeWindow, { key: 'g' }, button)
    iframeWindow.dispatchEvent(new iframeWindow.Event('blur'))
    pressInWindow(iframeWindow, { key: 'h' }, button)
    await tick()
    await stop(fiber)

    expect(received).toEqual([
      Message.PressedKeys({ name: 'PressedPaletteShortcut' }),
    ])
  }

  it('uses the owning realm for an iframe Window target', () =>
    verifyIframeTarget(({ iframeWindow }) => iframeWindow))

  it('uses the owning realm for an iframe Document target', () =>
    verifyIframeTarget(({ iframeDocument }) => iframeDocument))

  it('uses the owning realm for an iframe element target', () =>
    verifyIframeTarget(({ root }) => root))

  it('validates Mod against an iframe target realm', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)

    const iframeWindow = iframe.contentWindow
    if (iframeWindow === null) {
      throw new Error('Expected the iframe to have a window')
    }
    if (!hasEventConstructors(iframeWindow)) {
      throw new Error('Expected the iframe window to have event constructors')
    }

    const isParentApple = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
    const iframeUserAgent = isParentApple ? 'Windows' : 'Macintosh'
    const targetModKey: 'Control' | 'Meta' = isParentApple ? 'Control' : 'Meta'
    const parentModKey: 'Control' | 'Meta' = isParentApple ? 'Meta' : 'Control'
    Object.defineProperty(iframeWindow.navigator, 'userAgent', {
      configurable: true,
      value: iframeUserAgent,
    })

    expect(() =>
      streamFromKeyBindings<Message>({
        target: iframeWindow,
        bindings: [
          { keys: 'Mod+K', mapEvent: toMessage('PressedImplicitMod') },
          {
            keys: `${targetModKey}+K`,
            mapEvent: toMessage('PressedExplicitTargetMod'),
          },
        ],
      }),
    ).toThrowError(/duplicates/)

    const modifierInit = (modKey: 'Control' | 'Meta'): KeyboardEventInit =>
      modKey === 'Control' ? { ctrlKey: true } : { metaKey: true }
    const verifyTarget = async (
      target: EventTarget | (() => EventTarget),
    ): Promise<void> => {
      const { fiber, received } = await start({
        target,
        bindings: [
          { keys: 'Mod+K', mapEvent: toMessage('PressedImplicitMod') },
          {
            keys: `${parentModKey}+K`,
            mapEvent: toMessage('PressedExplicitParentMod'),
          },
        ],
      })

      pressInWindow(
        iframeWindow,
        { key: 'k', ...modifierInit(targetModKey) },
        iframeWindow,
      )
      pressInWindow(
        iframeWindow,
        { key: 'k', ...modifierInit(parentModKey) },
        iframeWindow,
      )
      await tick()
      await stop(fiber)

      expect(received).toEqual([
        Message.PressedKeys({ name: 'PressedImplicitMod' }),
        Message.PressedKeys({ name: 'PressedExplicitParentMod' }),
      ])
    }

    await verifyTarget(iframeWindow)
    await verifyTarget(() => iframeWindow)
  })

  it('rejects malformed and ambiguous binding tables', () => {
    expect(() =>
      streamFromKeyBindings<Message>({
        bindings: [
          {
            keys: 'Control+K',
            mapEvent: toMessage('PressedFirst'),
          },
          {
            keys: 'Control+K',
            mapEvent: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/duplicates/)

    expect(() =>
      streamFromKeyBindings<Message>({
        modKey: 'Control',
        bindings: [
          { keys: 'Mod+K', mapEvent: toMessage('PressedFirst') },
          { keys: 'Control+K', mapEvent: toMessage('PressedSecond') },
        ],
      }),
    ).toThrowError(/duplicates/)

    expect(() =>
      streamFromKeyBindings<Message>({
        modKey: 'Control',
        bindings: [
          { keys: 'Mod+K', mapEvent: toMessage('PressedFirst') },
          { keys: 'Meta+K', mapEvent: toMessage('PressedSecond') },
        ],
      }),
    ).not.toThrow()

    expect(() =>
      streamFromKeyBindings<Message>({
        bindings: [
          { keys: 'G', mapEvent: toMessage('PressedFirst') },
          {
            keys: ['G', 'H'],
            mapEvent: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/sequence prefix/)

    expect(() =>
      streamFromKeyBindings<Message>({
        bindings: [
          {
            keys: ['G', 'H'],
            mapEvent: toMessage('PressedFirst'),
          },
          {
            keys: ['G', 'P'],
            preventDefault: false,
            mapEvent: toMessage('PressedSecond'),
          },
        ],
      }),
    ).toThrowError(/same preventDefault/)

    expect(() =>
      streamFromKeyBindings<Message>({
        bindings: [
          {
            keys: 'Control++',
            mapEvent: toMessage('PressedMalformed'),
          },
        ],
      }),
    ).toThrowError(/use "Plus"/)

    expect(() =>
      streamFromKeyBindings<Message>({
        bindings: [
          {
            keys: 'CapsLock',
            mapEvent: toMessage('PressedModifierKey'),
          },
        ],
      }),
    ).toThrowError(/non-modifier/)

    expect(() =>
      streamFromKeyBindings<Message>({
        sequenceTimeout: Duration.zero,
        bindings: [],
      }),
    ).toThrowError(/above zero/)
  })
})
