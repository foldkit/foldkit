import {
  Array,
  Effect,
  Fiber,
  Option,
  PubSub,
  Queue,
  Schema,
  Stream,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { type DevToolsStore, INIT_INDEX } from '../devTools/store.js'
import { __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { afterCommit } from '../render/render.js'
import { modifyFields } from '../struct/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { __setDevToolsOverlay } from './devToolsConfig.js'
import { makeElement } from './makeElement.js'
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
  CompletedProbeCommittedDom: {},
  Ticked: {},
})
type Message = typeof Message.Type

const Model = Schema.Struct({ label: Schema.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const update = (_model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedTransition: () => ({ model: { label: 'transitioned' } }),
    ClickedPlain: () => ({ model: { label: 'plain' } }),
    CompletedProbeCommittedDom: () => ({ model: _model }),
    Ticked: () => ({ model: { label: 'ticked' } }),
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

  it('does not run an ordinary frame queued before jumpTo while the replay render is in progress', async () => {
    let maybeStore: DevToolsStore | null = null
    let maybeScheduledFrame: FrameRequestCallback | null = null
    let shouldRunFrameDuringReplay = false
    let renderCount = 0
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update,
      view: model => {
        renderCount += 1
        if (
          shouldRunFrameDuringReplay &&
          model.label === 'initial' &&
          maybeScheduledFrame !== null
        ) {
          const scheduledFrame = maybeScheduledFrame
          maybeScheduledFrame = null
          scheduledFrame(performance.now())
        }
        return h.div(
          [],
          [h.button([h.OnClick(Message.ClickedPlain())], ['go']), model.label],
        )
      },
      container,
      devTools: { show: 'Always' },
    })
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
      })

      const requestAnimationFrameSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation(callback => {
          maybeScheduledFrame = callback
          return 1
        })
      try {
        document.body.querySelector('button')!.click()
        await vi.waitFor(() => {
          expect(maybeScheduledFrame).not.toBeNull()
        })
        shouldRunFrameDuringReplay = true

        await Effect.runPromise(maybeStore!.jumpTo(INIT_INDEX))

        expect(renderCount).toBe(2)
        expect(document.body.textContent).toContain('initial')
        expect(document.body.textContent).not.toContain('plain')
      } finally {
        requestAnimationFrameSpy.mockRestore()
      }
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it.each(['before', 'after'])(
    'permanently invalidates a skipped transition callback that arrives %s the resume frame',
    async callbackTiming => {
      let maybeUpdate: (() => void) | null = null
      let isProbeWaiting = false
      let renderCount = 0
      const observedLabels: Array<string> = []
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

      const ProbeCommittedDom = Command.define('ProbeCommittedDom', {
        messages: [Message.CompletedProbeCommittedDom],
        execute: Effect.gen(function* () {
          isProbeWaiting = true
          yield* afterCommit
          observedLabels.push(
            document.querySelector('#label')?.textContent ?? '',
          )
          return Message.CompletedProbeCommittedDom()
        }),
      })
      let maybeStore: DevToolsStore | null = null
      __setDevToolsOverlay(store => {
        maybeStore = store
        return Effect.void
      })

      const element = makeElement({
        Model,
        init: () => ({ model: { label: 'initial' } }),
        update: (model: Model, message: Message) =>
          Message.match<Update.Return<Model, Message>>(message, {
            ClickedTransition: () => ({
              model: { label: 'transitioned' },
              commands: [ProbeCommittedDom()],
            }),
            ClickedPlain: () => ({ model: { label: 'plain' } }),
            CompletedProbeCommittedDom: () => ({ model }),
            Ticked: () => ({ model: { label: 'ticked' } }),
          }),
        view: model => {
          renderCount += 1
          return h.div(
            [],
            [
              h.button([h.OnClick(Message.ClickedTransition())], ['go']),
              h.div([h.Id('label')], [model.label]),
            ],
          )
        },
        container,
        viewTransition: () => true,
        devTools: { show: 'Always' },
      })
      const fiber = Effect.runFork(element.start())

      try {
        await awaitBodyText('initial')
        await vi.waitFor(() => {
          expect(maybeStore).not.toBeNull()
        })

        const scheduledFrames: Array<FrameRequestCallback> = []
        const requestAnimationFrameSpy = vi
          .spyOn(window, 'requestAnimationFrame')
          .mockImplementation(callback => {
            scheduledFrames.push(callback)
            return scheduledFrames.length
          })
        try {
          document.body.querySelector('button')!.click()
          await vi.waitFor(() => {
            expect(scheduledFrames).toHaveLength(1)
          })
          const transitionFrame = scheduledFrames.shift()
          if (transitionFrame === undefined) {
            throw new Error('Expected the transition frame to be scheduled')
          }
          transitionFrame(performance.now())
          await vi.waitFor(() => {
            expect(maybeUpdate).not.toBeNull()
            expect(isProbeWaiting).toBe(true)
          })

          await Effect.runPromise(maybeStore!.jumpTo(INIT_INDEX))
          await Effect.runPromise(maybeStore!.resume)
          expect(scheduledFrames).toHaveLength(1)

          if (callbackTiming === 'before') {
            maybeUpdate!()
            await new Promise<void>(resolve => queueMicrotask(() => resolve()))
            expect(observedLabels).toEqual([])
          }

          const resumeFrame = scheduledFrames.shift()
          if (resumeFrame === undefined) {
            throw new Error('Expected the resume frame to be scheduled')
          }
          resumeFrame(performance.now())
          await vi.waitFor(() => {
            expect(observedLabels).toEqual(['transitioned'])
          })
          const renderCountAfterResume = renderCount

          if (callbackTiming === 'after') {
            maybeUpdate!()
            await new Promise<void>(resolve => queueMicrotask(() => resolve()))
          }
          expect(renderCount).toBe(renderCountAfterResume)
        } finally {
          requestAnimationFrameSpy.mockRestore()
        }
      } finally {
        await Effect.runPromise(Fiber.interrupt(fiber))
      }
    },
  )

  it('resumes a paused view without a View Transition', async () => {
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

    const subscriptionMessages = await Effect.runPromise(
      PubSub.unbounded<Message>(),
    )
    let isSubscriptionReady = false
    const subscriptions = Subscription.make<Model, Message>()(() => ({
      testMessages: Subscription.persistentEntry(
        Stream.fromEffect(
          Effect.sync(() => {
            isSubscriptionReady = true
          }),
        ).pipe(Stream.flatMap(() => Stream.fromPubSub(subscriptionMessages))),
      ),
    }))
    let didProcessTick = false
    let maybeStore: DevToolsStore | null = null
    __setDevToolsOverlay(store => {
      maybeStore = store
      return Effect.void
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update: (model, message) => {
        if (message._tag === 'Ticked') {
          didProcessTick = true
        }
        return update(model, message)
      },
      view: model => h.div([], [model.label]),
      subscriptions,
      container,
      viewTransition: () => true,
      devTools: { show: 'Always' },
    })
    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      await vi.waitFor(() => {
        expect(maybeStore).not.toBeNull()
        expect(isSubscriptionReady).toBe(true)
      })

      await Effect.runPromise(maybeStore!.jumpTo(INIT_INDEX))
      PubSub.publishUnsafe(subscriptionMessages, Message.Ticked())
      await vi.waitFor(() => {
        expect(didProcessTick).toBe(true)
      })
      expect(document.body.textContent).toContain('initial')

      await Effect.runPromise(maybeStore!.resume)
      await awaitBodyText('ticked')

      expect(transitionCalls).toEqual([])
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

  it('settles afterCommit when a crash invalidates a pending transition', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

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

    const crashTrigger = await Effect.runPromise(Queue.unbounded<void>())
    const afterCrashProbeTrigger = await Effect.runPromise(
      Queue.unbounded<void>(),
    )
    let didPendingProbeResume = false
    let didAfterCrashProbeResume = false

    const ProbePendingCommit = Command.define('ProbePendingCommit', {
      messages: [Message.CompletedProbeCommittedDom],
      execute: Effect.gen(function* () {
        yield* afterCommit
        didPendingProbeResume = true
        return Message.CompletedProbeCommittedDom()
      }),
    })
    const CrashRuntime = Command.define('CrashRuntime', {
      messages: [Message.CompletedProbeCommittedDom],
      execute: Effect.gen(function* () {
        yield* Queue.take(crashTrigger)
        return yield* Effect.die(new Error('boom from Command'))
      }),
    })
    const ProbeAfterCrash = Command.define('ProbeAfterCrash', {
      messages: [Message.CompletedProbeCommittedDom],
      execute: Effect.gen(function* () {
        yield* Queue.take(afterCrashProbeTrigger)
        yield* afterCommit
        didAfterCrashProbeResume = true
        return Message.CompletedProbeCommittedDom()
      }),
    })

    const element = makeElement({
      Model,
      init: () => ({ model: { label: 'initial' } }),
      update: (model: Model, message: Message) =>
        Message.match<Update.Return<Model, Message>>(message, {
          ClickedTransition: () => ({
            model: { label: 'transitioned' },
            commands: [ProbePendingCommit(), CrashRuntime(), ProbeAfterCrash()],
          }),
          ClickedPlain: () => ({ model: { label: 'plain' } }),
          CompletedProbeCommittedDom: () => ({ model }),
          Ticked: () => ({ model: { label: 'ticked' } }),
        }),
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
      crash: { view: () => h.div([], ['Crashed']) },
    })

    const fiber = Effect.runFork(element.start())

    try {
      await awaitBodyText('initial')
      document.body.querySelector('button')!.click()
      await vi.waitFor(() => {
        expect(maybeUpdate).not.toBeNull()
      })

      Queue.offerUnsafe(crashTrigger, undefined)
      await awaitBodyText('Crashed')
      maybeUpdate!()

      await vi.waitFor(() => {
        expect(didPendingProbeResume).toBe(true)
      })

      Queue.offerUnsafe(afterCrashProbeTrigger, undefined)
      await vi.waitFor(() => {
        expect(didAfterCrashProbeResume).toBe(true)
      })
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

describe('queue-blocked commit opportunities', () => {
  const PulseModel = Schema.Struct({
    count: Schema.Number,
    value: Schema.String,
  })
  type PulseModel = typeof PulseModel.Type
  const PulseMessage = defineMessageUnion({
    ClickedPulse: { cost: Schema.Number },
    UpdatedValue: { value: Schema.String },
    FailedPulse: {},
    ClickedWait: {},
    CompletedWaitForCommit: {},
  })
  type PulseMessage = typeof PulseMessage.Type
  const UPDATE_COST_MS = 6
  const PRODUCER_COUNT = 24
  let processingTime = 0
  let frames: Array<FrameRequestCallback> = []
  let deliveries: Array<() => void> = []

  beforeEach(() => {
    processingTime = 0
    frames = []
    deliveries = []
    vi.spyOn(performance, 'now').mockImplementation(() => processingTime)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal(
      'MessageChannel',
      class {
        port1 = {
          postMessage: () => deliveries.push(() => this.port2.onmessage?.()),
          close: () => {},
        }
        port2: { onmessage?: () => void; close: () => void } = {
          close: () => {},
        }
      },
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    __setDevToolsOverlay(undefined)
    Reflect.deleteProperty(document, 'startViewTransition')
    document.body.replaceChildren()
  })

  const runFrame = () => {
    expect(frames).not.toHaveLength(0)
    for (const frame of frames.splice(0)) {
      frame(processingTime)
    }
  }
  const deliver = () => {
    const delivery = deliveries.shift()
    expect(delivery).toBeDefined()
    delivery?.()
  }
  const callbackAt = (callbacks: ReadonlyArray<() => void>, index: number) =>
    Array.get(callbacks, index).pipe(Option.getOrThrow)

  const start = async (isTransition = false, isDevTools = false) => {
    let dispatch: ((message: PulseMessage) => void) | undefined
    let maybeStore = Option.none<DevToolsStore>()
    let isReentrant = false
    let producerLimit = Infinity
    let completedWaitCount = 0
    const processed: Array<number> = []
    const rendered: Array<PulseModel> = []
    const callbacks: Array<() => void> = []
    const observedCommits: Array<string | null | undefined> = []
    const skipTransition = vi.fn()
    if (isTransition) {
      Object.defineProperty(document, 'startViewTransition', {
        configurable: true,
        value: (callback: () => void) => {
          callbacks.push(callback)
          return { updateCallbackDone: Promise.resolve(), skipTransition }
        },
      })
    }
    if (isDevTools) {
      __setDevToolsOverlay(store => {
        maybeStore = Option.some(store)
        return Effect.void
      })
    }
    const host = document.createElement('div')
    host.id = 'queue-opportunity-app'
    document.body.appendChild(host)
    const element = makeElement({
      Model: PulseModel,
      container: host,
      devTools: isDevTools ? { show: 'Always' } : false,
      init: () => ({ model: { count: 0, value: '' } }),
      update: (model: PulseModel, message: PulseMessage) =>
        PulseMessage.match<Update.Return<PulseModel, PulseMessage>>(message, {
          ClickedPulse: ({ cost }) => {
            processingTime += cost
            const nextCount = model.count + 1
            processed.push(nextCount)
            if (isReentrant && nextCount < producerLimit) {
              document.getElementById('queue-pulse')?.click()
            }
            return { model: modifyFields(model, { count: () => nextCount }) }
          },
          UpdatedValue: ({ value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
          FailedPulse: () => {
            throw new Error('forced prefix failure')
          },
          ClickedWait: () => ({
            model,
            commands: [
              {
                name: 'WaitForCommit',
                effect: Effect.gen(function* () {
                  yield* afterCommit
                  observedCommits.push(
                    document.getElementById('queue-count')?.textContent,
                  )
                  return PulseMessage.CompletedWaitForCommit()
                }),
              },
            ],
          }),
          CompletedWaitForCommit: () => {
            completedWaitCount += 1
            return { model }
          },
        }),
      view: (model, h) => {
        dispatch = __requireDispatch()
        rendered.push(model)
        return h.div(
          [],
          [
            h.p([h.Id('queue-count')], [globalThis.String(model.count)]),
            h.input([
              h.Id('queue-field'),
              h.Value(model.value),
              h.OnInput(value => PulseMessage.UpdatedValue({ value })),
            ]),
            h.button(
              [
                h.Id('queue-pulse'),
                h.OnClick(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS })),
              ],
              ['Pulse'],
            ),
          ],
        )
      },
      crash: { view: (_context, h) => h.div([], ['queue-crash']) },
      ...(isTransition ? { viewTransition: () => true } : {}),
    })
    const fiber = Effect.runFork(element.start())
    await vi.waitFor(() => {
      expect(dispatch).toBeDefined()
    })
    await new Promise(resolve => setTimeout(resolve, 0))
    const send = (message: PulseMessage) => {
      if (dispatch === undefined) {
        throw new Error('Runtime has not booted')
      }
      dispatch(message)
    }
    return {
      send,
      rendered,
      processed,
      callbacks,
      observedCommits,
      skipTransition,
      store: () => Option.getOrThrow(maybeStore),
      completedWaitCount: () => completedWaitCount,
      produce: (limit = Infinity) => {
        isReentrant = true
        producerLimit = limit
        document.getElementById('queue-pulse')?.click()
      },
      stopProducing: () => {
        isReentrant = false
      },
      stop: () => {
        isReentrant = false
        return Effect.runPromise(Fiber.interrupt(fiber))
      },
    }
  }

  it.each(['Reentrant', 'External'])(
    'commits intermediate Models for a costly %s producer in FIFO order',
    async kind => {
      const app = await start()
      try {
        if (kind === 'Reentrant') {
          app.produce(PRODUCER_COUNT)
        } else {
          app.send(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS }))
          app.send(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS }))
        }
        while (app.processed.length < PRODUCER_COUNT) {
          runFrame()
          if (Array.isArrayNonEmpty(deliveries)) {
            deliver()
          }
          if (kind === 'External' && app.processed.length < PRODUCER_COUNT) {
            app.send(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS }))
            if (
              Array.isArrayEmpty(deliveries) &&
              app.processed.length < PRODUCER_COUNT
            ) {
              app.send(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS }))
            }
          }
        }
        if (Array.isArrayNonEmpty(frames)) {
          runFrame()
        }
        expect(app.rendered.map(model => model.count)).toEqual([
          0, 5, 10, 15, 20, 24,
        ])
        expect(app.processed).toEqual(Array.range(1, PRODUCER_COUNT))
        expect(document.getElementById('queue-count')?.textContent).toBe('24')
      } finally {
        await app.stop()
      }
    },
  )

  it('incorporates queued input on the fourth blocked frame and retains the producer suffix task', async () => {
    const app = await start()
    try {
      app.produce()
      const field = document.getElementById('queue-field')
      expect(field).toBeInstanceOf(HTMLInputElement)
      if (!(field instanceof HTMLInputElement)) {
        throw new Error('Missing controlled input')
      }
      field.value = 'queued value'
      field.dispatchEvent(new Event('input', { bubbles: true }))
      for (let turn = 0; turn < 3; turn++) {
        runFrame()
        expect(app.rendered).toHaveLength(1)
      }
      runFrame()
      expect(Array.last(app.rendered)).toEqual(
        Option.some({ count: 2, value: 'queued value' }),
      )
      expect(field.value).toBe('queued value')
      expect(app.processed).toEqual([1, 2])
      expect(deliveries).toHaveLength(1)
      expect(frames).toHaveLength(1)
    } finally {
      await app.stop()
    }
  })

  it('resets the allowance after each successful live patch', async () => {
    const app = await start()
    try {
      app.produce()
      for (let turn = 1; turn <= 8; turn++) {
        runFrame()
        expect(app.rendered).toHaveLength(1 + Math.floor(turn / 4))
        deliver()
      }
    } finally {
      await app.stop()
    }
  })

  it('forces the fourth blocked transition callback despite clear queues at transition start', async () => {
    const app = await start(true)
    try {
      for (let turn = 0; turn < 4; turn++) {
        processingTime += UPDATE_COST_MS
        app.send(PulseMessage.ClickedPulse({ cost: 0 }))
        runFrame()
        expect(app.callbacks).toHaveLength(turn + 1)
        app.send(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS }))
        app.send(PulseMessage.ClickedPulse({ cost: UPDATE_COST_MS }))
        callbackAt(app.callbacks, turn)()
        expect(app.rendered).toHaveLength(turn < 3 ? 1 : 2)
        while (Array.isArrayNonEmpty(deliveries)) {
          deliver()
        }
      }
      expect(app.skipTransition).toHaveBeenCalledTimes(4)
      for (const callback of app.callbacks) {
        callback()
        callback()
      }
      expect(app.rendered).toHaveLength(2)
    } finally {
      await app.stop()
    }
  })

  it('shares one refusal allowance between delayed callbacks and frames', async () => {
    const app = await start(true)
    try {
      app.send(PulseMessage.ClickedPulse({ cost: 0 }))
      runFrame()
      app.produce()
      callbackAt(app.callbacks, 0)()
      runFrame()
      runFrame()
      expect(app.rendered).toHaveLength(1)
      runFrame()
      expect(app.rendered).toHaveLength(2)
      expect(app.callbacks).toHaveLength(1)
    } finally {
      await app.stop()
    }
  })

  it('invalidates an older transition when a forced plain frame commits', async () => {
    const app = await start(true)
    try {
      app.send(PulseMessage.ClickedPulse({ cost: 0 }))
      runFrame()
      app.produce()
      for (let turn = 0; turn < 4; turn++) {
        runFrame()
      }
      expect(app.rendered).toHaveLength(2)
      expect(app.callbacks).toHaveLength(1)
      expect(app.skipTransition).toHaveBeenCalledTimes(1)
      callbackAt(app.callbacks, 0)()
      callbackAt(app.callbacks, 0)()
      expect(app.rendered).toHaveLength(2)
    } finally {
      await app.stop()
    }
  })

  it('keeps afterCommit pending through refusals and completes it once after the forced patch', async () => {
    const app = await start()
    try {
      app.send(PulseMessage.ClickedPulse({ cost: 0 }))
      app.send(PulseMessage.ClickedWait())
      await new Promise(resolve => setTimeout(resolve, 0))
      app.produce()
      for (let turn = 0; turn < 3; turn++) {
        runFrame()
      }
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(app.completedWaitCount()).toBe(0)
      expect(app.observedCommits).toEqual([])
      runFrame()
      app.stopProducing()
      while (Array.isArrayNonEmpty(deliveries)) {
        deliver()
      }
      await vi.waitFor(() => {
        expect(app.completedWaitCount()).toBe(1)
      })
      expect(document.getElementById('queue-count')?.textContent).toBe('3')
      expect(app.observedCommits).toEqual(['3'])
    } finally {
      await app.stop()
    }
  })

  it('ignores held frames and transition callbacks after disposal', async () => {
    const app = await start(true)
    app.send(PulseMessage.ClickedPulse({ cost: 0 }))
    runFrame()
    app.produce()
    const heldFrames = frames.splice(0)
    await app.stop()
    const renderCount = app.rendered.length
    callbackAt(app.callbacks, 0)()
    for (const frame of heldFrames) {
      frame(processingTime)
    }
    expect(app.rendered).toHaveLength(renderCount)
    expect(app.processed).toEqual([1, 2])
    expect(frames).toHaveLength(0)
    expect(document.body.textContent).toBe('')
  })

  it('preserves the crash view when forced prefix processing throws', async () => {
    const app = await start()
    try {
      app.produce()
      app.send(PulseMessage.FailedPulse())
      for (let turn = 0; turn < 4; turn++) {
        runFrame()
      }
      expect(document.body.textContent).toBe('queue-crash')
      expect(app.rendered).toHaveLength(1)
    } finally {
      await app.stop()
    }
  })

  it.each([0, 1])(
    'preserves restore intent and the allowance through replay after %s refusals',
    async priorRefusals => {
      const app = await start(false, true)
      try {
        app.produce()
        for (let turn = 0; turn < priorRefusals; turn++) {
          runFrame()
        }
        await Effect.runPromise(app.store().jumpTo(INIT_INDEX))
        runFrame()
        expect(document.getElementById('queue-count')?.textContent).toBe('0')
        await Effect.runPromise(app.store().resume)
        for (let turn = 0; turn < 3 - priorRefusals; turn++) {
          runFrame()
          expect(document.getElementById('queue-count')?.textContent).toBe('0')
        }
        runFrame()
        expect(document.getElementById('queue-count')?.textContent).toBe('2')
      } finally {
        await app.stop()
      }
    },
  )
})
