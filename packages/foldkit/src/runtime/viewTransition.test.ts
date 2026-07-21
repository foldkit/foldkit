import { Effect, Fiber, Match as M, Option, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { html } from '../html/index.js'
import { m } from '../message/index.js'
import { makeElement } from './runtime.js'
import {
  __decideViewTransition,
  __resolveStartViewTransition,
} from './viewTransition.js'

describe('__decideViewTransition', () => {
  const context = { model: 'model', message: 'message' }

  it('returns none when the predicate declines', () => {
    const decision = __decideViewTransition(() => false, context)

    expect(Option.isNone(decision)).toBe(true)
  })

  it('returns some with no types when the predicate returns true', () => {
    const decision = __decideViewTransition(() => true, context)

    expect(decision).toEqual(Option.some({ maybeTypes: Option.none() }))
  })

  it('returns some with types when the predicate returns a types object', () => {
    const decision = __decideViewTransition(
      () => ({ types: ['slide-forward'] }),
      context,
    )

    expect(decision).toEqual(
      Option.some({ maybeTypes: Option.some(['slide-forward']) }),
    )
  })

  it('passes the model and message through to the predicate', () => {
    const seen: Array<typeof context> = []

    __decideViewTransition(receivedContext => {
      seen.push(receivedContext)
      return false
    }, context)

    expect(seen).toEqual([context])
  })
})

describe('__resolveStartViewTransition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, 'startViewTransition')
  })

  it('returns none when the browser lacks the View Transitions API', () => {
    expect(Option.isNone(__resolveStartViewTransition())).toBe(true)
  })

  it('calls the plain callback form when transition types are unsupported', () => {
    const received: Array<unknown> = []
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: unknown) => {
        received.push(callbackOptions)
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => {},
        }
      },
    })

    const maybeStartViewTransition = __resolveStartViewTransition()
    expect(Option.isSome(maybeStartViewTransition)).toBe(true)
    if (Option.isSome(maybeStartViewTransition)) {
      maybeStartViewTransition.value(() => {}, Option.some(['slide-forward']))
    }

    expect(received).toEqual([expect.any(Function)])
  })

  it('calls the options form with types when the browser supports them', () => {
    const received: Array<unknown> = []
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: unknown) => {
        received.push(callbackOptions)
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => {},
        }
      },
    })
    vi.stubGlobal(
      'ViewTransition',
      class {
        get types(): ReadonlyArray<string> {
          return []
        }
      },
    )

    const maybeStartViewTransition = __resolveStartViewTransition()
    expect(Option.isSome(maybeStartViewTransition)).toBe(true)
    if (Option.isSome(maybeStartViewTransition)) {
      maybeStartViewTransition.value(() => {}, Option.some(['slide-forward']))
    }

    expect(received).toEqual([
      expect.objectContaining({
        types: ['slide-forward'],
        update: expect.any(Function),
      }),
    ])
  })
})

const ClickedTransition = m('ClickedTransition')
const ClickedPlain = m('ClickedPlain')
const Message = S.Union([ClickedTransition, ClickedPlain])
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const h = html<Message>()

const update = (
  _model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      ClickedTransition: () => [{ label: 'transitioned' }, []],
      ClickedPlain: () => [{ label: 'plain' }, []],
    }),
  )

describe('makeElement with viewTransition', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    Reflect.deleteProperty(document, 'startViewTransition')
  })

  const awaitBodyText = (text: string): Promise<void> =>
    vi.waitFor(() => {
      expect(document.body.textContent).toContain(text)
    })

  it('wraps matching renders in a View Transition and leaves the rest plain', async () => {
    const transitionCalls: Array<unknown> = []
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: () => void) => {
        transitionCalls.push(callbackOptions)
        callbackOptions()
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => {},
        }
      },
    })

    const element = makeElement({
      Model,
      init: () => [{ label: 'initial' }, []],
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(ClickedTransition())], ['transition']),
            h.button([h.OnClick(ClickedPlain())], ['plain']),
            model.label,
          ],
        ),
      container,
      viewTransition: ({ message }) => message._tag === 'ClickedTransition',
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      expect(transitionCalls).toEqual([])

      const buttons = document.body.querySelectorAll('button')
      const plainButton = buttons.item(1)
      plainButton.click()
      await awaitBodyText('plain')
      expect(transitionCalls).toEqual([])

      const transitionButton = buttons.item(0)
      transitionButton.click()
      await awaitBodyText('transitioned')
      expect(transitionCalls).toEqual([expect.any(Function)])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('defers the render into the transition update callback rather than painting eagerly', async () => {
    // NOTE: the real API invokes the update callback asynchronously after
    // snapshotting the old DOM. This fake captures the callback without
    // running it, so the test can assert the frame did not paint until the
    // callback fires, and that the callback renders the model live at call
    // time (`runRenderFrameBody` reads the closure, so no stale snapshot).
    let maybeUpdate: (() => void) | null = null
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: () => void) => {
        maybeUpdate = callbackOptions
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => {},
        }
      },
    })

    const element = makeElement({
      Model,
      init: () => [{ label: 'initial' }, []],
      update,
      view: model =>
        h.div(
          [],
          [h.button([h.OnClick(ClickedTransition())], ['go']), model.label],
        ),
      container,
      viewTransition: ({ message }) => message._tag === 'ClickedTransition',
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')

      document.body.querySelector('button')!.click()

      // The frame decided to transition and handed its render to the update
      // callback, which the fake has not run, so the DOM still shows the old
      // label.
      await vi.waitFor(() => {
        expect(maybeUpdate).not.toBeNull()
      })
      expect(document.body.textContent).toContain('initial')
      expect(document.body.textContent).not.toContain('transitioned')

      // Firing the update callback performs the render.
      maybeUpdate!()
      await awaitBodyText('transitioned')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})
