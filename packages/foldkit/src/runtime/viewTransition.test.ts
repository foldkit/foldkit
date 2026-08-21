import { Effect, Fiber, Option, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Command } from '../command/index.js'
import { type DevToolsStore, INIT_INDEX } from '../devTools/store.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { __setDevToolsOverlay, makeElement } from './runtime.js'
import {
  __decideViewTransition,
  __resolveStartViewTransition,
  __silenceViewTransitionRejections,
} from './viewTransition.js'

describe('__silenceViewTransitionRejections', () => {
  // NOTE: the spies call through, so the real handlers are attached and the
  // rejected promises below are genuinely handled. Asserting on the attachment
  // rather than on a global unhandled-rejection hook keeps the test free of
  // host-specific globals, and attachment is the whole contract: a skipped
  // transition rejects `ready`, and a rejection nobody claimed is what reaches
  // the application's error reporting.
  it('attaches a handler to every promise a skipped transition can reject', async () => {
    const ready = Promise.reject(new Error('AbortError'))
    const finished = Promise.reject(new Error('AbortError'))
    const updateCallbackDone = Promise.resolve()

    const readyCatch = vi.spyOn(ready, 'catch')
    const finishedCatch = vi.spyOn(finished, 'catch')
    const updateCatch = vi.spyOn(updateCallbackDone, 'catch')

    __silenceViewTransitionRejections({
      updateCallbackDone,
      skipTransition: () => {},
      ready,
      finished,
    })

    expect(readyCatch).toHaveBeenCalled()
    expect(finishedCatch).toHaveBeenCalled()
    expect(updateCatch).toHaveBeenCalled()

    await Promise.allSettled([ready, finished, updateCallbackDone])
  })

  it('tolerates a handle that carries neither promise', () => {
    expect(() =>
      __silenceViewTransitionRejections({
        updateCallbackDone: Promise.resolve(),
        skipTransition: () => {},
      }),
    ).not.toThrow()
  })
})

describe('__decideViewTransition', () => {
  const context = {
    previousModel: 'previousModel',
    model: 'model',
    message: 'message',
  }

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

const Message = defineMessageUnion({
  ClickedTransition: {},
  ClickedPlain: {},
})
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command<Message>>
  outMessage?: never
}>

const update = (_model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedTransition: () => ({ model: { label: 'transitioned' } }),
    ClickedPlain: () => ({ model: { label: 'plain' } }),
  })

describe('makeElement with viewTransition', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    __setDevToolsOverlay(undefined)
    document.body.innerHTML = ''
    Reflect.deleteProperty(document, 'startViewTransition')
  })

  const awaitBodyText = (text: string): Promise<void> =>
    vi.waitFor(() => {
      expect(document.body.textContent).toContain(text)
    })

  // NOTE: DevTools time-travel is the one path that repaints the container
  // without going through a render frame, so it is the only way the DOM and
  // `lastRenderedModel` can disagree. The registered overlay callback is the
  // seam: it receives the store, so a fake can drive `jumpTo` from a test.
  it('does not let a pending transition paint over a time-travel replay', async () => {
    let maybeUpdate: (() => void) | null = null
    const skipCalls: Array<string> = []
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: () => void) => {
        maybeUpdate = callbackOptions
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => skipCalls.push('skipped'),
        }
      },
    })

    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['go']),
            model.label,
          ],
        ),
      container,
      viewTransition: () => true,
      devTools: {
        show: 'Always',
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })

      document.body.querySelector('button')!.click()
      await vi.waitFor(() => {
        expect(maybeUpdate).not.toBeNull()
      })
      // The transition is holding the patch, so the DOM still shows `initial`.
      expect(document.body.textContent).not.toContain('transitioned')

      // Time-travel to the first entry. This repaints the container itself.
      await Effect.runPromise(maybeStore!.jumpTo(INIT_INDEX))
      expect(skipCalls).toEqual(['skipped'])
      expect(document.body.textContent).not.toContain('transitioned')

      // The held callback now fires late. A paused runtime must not patch the
      // live Model over the state the user is inspecting.
      maybeUpdate!()
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

      expect(document.body.textContent).not.toContain('transitioned')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('hands the predicate the painted Model and the incoming one', async () => {
    const seenPairs: Array<readonly [string, string]> = []
    // NOTE: defers the callback rather than running it inline. The real API
    // never invokes it synchronously, and `previousModel` only advances when
    // the callback patches, so a synchronous fake would hide an ordering bug
    // between the predicate and the render it decided on.
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: () => void) => {
        queueMicrotask(callbackOptions)
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => {},
        }
      },
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['transition']),
            h.button([h.OnClick(Message.ClickedPlain())], ['plain']),
            model.label,
          ],
        ),
      container,
      viewTransition: ({ previousModel, model }) => {
        seenPairs.push([previousModel.label, model.label])
        return true
      },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      const buttons = document.body.querySelectorAll('button')

      // NOTE: waits on the recorded pairs rather than on body text. "plain" is
      // also the second button's label, so a text wait passes before that
      // click's frame has run.
      buttons.item(0).click()
      await vi.waitFor(() => {
        expect(seenPairs).toHaveLength(1)
      })

      buttons.item(1).click()
      await vi.waitFor(() => {
        expect(seenPairs).toHaveLength(2)
      })

      // `previousModel` trails one paint behind `model` every time. The first
      // pair proves it is the painted state rather than a copy of the incoming
      // one, and the second proves it advanced with the render that committed.
      expect(seenPairs).toEqual([
        ['initial', 'transitioned'],
        ['transitioned', 'plain'],
      ])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
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
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['transition']),
            h.button([h.OnClick(Message.ClickedPlain())], ['plain']),
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
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['go']),
            model.label,
          ],
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

  it('renders plainly when the user has asked for reduced motion', async () => {
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
    // NOTE: stubbed before `makeElement`, which is where the runtime resolves
    // the query it then reads per frame.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['go']),
            model.label,
          ],
        ),
      container,
      viewTransition: () => true,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      document.body.querySelector('button')!.click()

      // The render still lands; it just never went through a transition.
      await awaitBodyText('transitioned')
      expect(transitionCalls).toEqual([])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      vi.unstubAllGlobals()
    }
  })

  it('skips a transition left pending when the runtime crashes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const skipCalls: Array<string> = []
    let startedCount = 0
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      // NOTE: never invokes the callback, so the transition is still pending
      // when the crashing render runs.
      value: () => {
        startedCount = startedCount + 1
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => skipCalls.push('skipped'),
        }
      },
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model => {
        if (model.label === 'plain') {
          throw new Error('boom from view')
        }
        return h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['transition']),
            h.button([h.OnClick(Message.ClickedPlain())], ['plain']),
            model.label,
          ],
        )
      },
      container,
      viewTransition: ({ message }) => message._tag === 'ClickedTransition',
      crash: { view: () => h.div([], ['Crashed']) },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      const buttons = document.body.querySelectorAll('button')

      buttons.item(0).click()
      await vi.waitFor(() => {
        expect(startedCount).toBe(1)
      })
      expect(skipCalls).toEqual([])

      // The crashing render is a plain one, so it patches the crash view while
      // the transition above is still holding its own update callback.
      buttons.item(1).click()
      await awaitBodyText('Crashed')

      expect(skipCalls).toEqual(['skipped'])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      vi.restoreAllMocks()
    }
  })

  it('falls back to a plain render when startViewTransition throws', async () => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: () => {
        throw new Error('transitions unavailable')
      },
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['go']),
            model.label,
          ],
        ),
      container,
      viewTransition: () => true,
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      document.body.querySelector('button')!.click()

      // A throw escaping the frame callback would strand the render and every
      // `Render.afterCommit` waiting on it.
      await awaitBodyText('transitioned')
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('skips a transition still pending when the next frame supersedes it', async () => {
    const skipCalls: Array<number> = []
    let startedCount = 0
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (callbackOptions: () => void) => {
        const index = startedCount
        startedCount = startedCount + 1
        // NOTE: never invokes the callback, so the transition stays pending
        // and the next click has something to supersede.
        void callbackOptions
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => skipCalls.push(index),
        }
      },
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['transition']),
            h.button([h.OnClick(Message.ClickedPlain())], ['plain']),
            model.label,
          ],
        ),
      container,
      viewTransition: ({ message }) => message._tag === 'ClickedTransition',
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')

      const transitionButton = document.body.querySelectorAll('button').item(0)
      transitionButton.click()
      await vi.waitFor(() => {
        expect(startedCount).toBe(1)
      })
      expect(skipCalls).toEqual([])

      transitionButton.click()
      await vi.waitFor(() => {
        expect(startedCount).toBe(2)
      })

      expect(skipCalls).toEqual([0])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('skips a transition left pending when the runtime is disposed', async () => {
    const skipCalls: Array<string> = []
    let startedCount = 0
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      // NOTE: never invokes the callback, so the transition is still pending
      // when the runtime tears down.
      value: () => {
        startedCount = startedCount + 1
        return {
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => skipCalls.push('skipped'),
        }
      },
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedTransition())], ['go']),
            model.label,
          ],
        ),
      container,
      viewTransition: () => true,
    })

    const fiber = Effect.runFork(element.start())

    await awaitBodyText('initial')
    document.body.querySelector('button')!.click()
    await vi.waitFor(() => {
      expect(startedCount).toBe(1)
    })
    expect(skipCalls).toEqual([])

    await Effect.runPromise(Fiber.interrupt(fiber))

    // A transition outliving the runtime would keep animating over a
    // container the teardown has already restored.
    expect(skipCalls).toEqual(['skipped'])
  })
})
