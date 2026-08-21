import { Effect, Fiber, Schema as S } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import { __htmlBuilder } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import { RenderCommit, createCommitNotifier } from '../render/commit.js'
import { afterCommit } from '../render/render.js'
import { makeElement } from './runtime.js'

describe('afterCommit', () => {
  it('resumes on a commit that lands after it registered', async () => {
    const notifier = createCommitNotifier()
    notifier.markCommitPending()

    queueMicrotask(() => notifier.notifyCommitted())

    const outcome = await Effect.runPromise(
      afterCommit.pipe(
        Effect.as('resumed' as const),
        Effect.timeout('500 millis'),
        Effect.orElseSucceed(() => 'parked' as const),
        Effect.provideService(RenderCommit, notifier.service),
      ),
    )

    expect(outcome).toBe('resumed')
  })

  // NOTE: the case that separates waiting on the commit signal from waiting on
  // a frame. Animation frames keep firing throughout, so an implementation
  // that resumes on one cannot stay parked here.
  it('stays parked while a commit is outstanding and never lands', async () => {
    const notifier = createCommitNotifier()
    notifier.markCommitPending()

    const outcome = await Effect.runPromise(
      afterCommit.pipe(
        Effect.as('resumed' as const),
        Effect.timeout('300 millis'),
        Effect.orElseSucceed(() => 'parked' as const),
        Effect.provideService(RenderCommit, notifier.service),
      ),
    )

    expect(outcome).toBe('parked')
  })

  it('falls back to a frame when no commit is outstanding', async () => {
    const notifier = createCommitNotifier()

    const outcome = await Effect.runPromise(
      afterCommit.pipe(
        Effect.as('resumed' as const),
        Effect.timeout('500 millis'),
        Effect.orElseSucceed(() => 'parked' as const),
        Effect.provideService(RenderCommit, notifier.service),
      ),
    )

    expect(outcome).toBe('resumed')
  })
})

describe('createCommitNotifier', () => {
  it('reports no commit pending until a frame is marked', () => {
    const notifier = createCommitNotifier()

    expect(notifier.service.isCommitPending()).toBe(false)

    notifier.markCommitPending()
    expect(notifier.service.isCommitPending()).toBe(true)

    notifier.notifyCommitted()
    expect(notifier.service.isCommitPending()).toBe(false)
  })

  it('invokes every registered callback once per commit', () => {
    const notifier = createCommitNotifier()
    const calls: Array<string> = []

    notifier.service.onNextCommit(() => calls.push('first'))
    notifier.service.onNextCommit(() => calls.push('second'))
    notifier.notifyCommitted()
    notifier.notifyCommitted()

    expect(calls).toEqual(['first', 'second'])
  })

  it('defers a callback registered during a commit to the next commit', () => {
    const notifier = createCommitNotifier()
    const calls: Array<string> = []

    notifier.service.onNextCommit(() => {
      calls.push('outer')
      notifier.service.onNextCommit(() => calls.push('inner'))
    })

    notifier.notifyCommitted()
    expect(calls).toEqual(['outer'])

    notifier.notifyCommitted()
    expect(calls).toEqual(['outer', 'inner'])
  })

  it('drops a callback that unsubscribes before the commit', () => {
    const notifier = createCommitNotifier()
    const calls: Array<string> = []

    const unsubscribe = notifier.service.onNextCommit(() => calls.push('kept'))
    unsubscribe()
    notifier.notifyCommitted()

    expect(calls).toEqual([])
  })
})

const LABEL_ELEMENT_ID = 'render-commit-label'

// NOTE: what the probe Command saw in the DOM at the moment `afterCommit`
// resumed. Every assertion below turns on this, because the contract under
// test is precisely "a waiter never observes the pre-patch tree".
let observedLabels: Array<string> = []

const Message = defineMessageUnion({
  ClickedTransition: {},
  CompletedProbeCommittedDom: {},
})
type Message = typeof Message.Type

const Model = S.Struct({ label: S.String })
type Model = typeof Model.Type

const h = __htmlBuilder<Message>()

const ProbeCommittedDom = Command.define('ProbeCommittedDom', {
  messages: [Message.CompletedProbeCommittedDom],
  execute: Effect.gen(function* () {
    yield* afterCommit
    const label = document.getElementById(LABEL_ELEMENT_ID)
    observedLabels.push(label?.textContent ?? '')
    return Message.CompletedProbeCommittedDom()
  }),
})

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedTransition: () => ({
      model: { label: 'transitioned' },
      commands: [ProbeCommittedDom()],
    }),
    CompletedProbeCommittedDom: () => ({ model }),
  })

describe('Render.afterCommit inside a View Transition', () => {
  let container: HTMLElement

  beforeEach(() => {
    observedLabels = []
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    Reflect.deleteProperty(document, 'startViewTransition')
  })

  const startElement = () =>
    Effect.runFork(
      makeElement({
        Model,
        init: () => ({ model: { label: 'initial' } }),
        update,
        view: model =>
          h.div(
            [],
            [
              h.button([h.OnClick(Message.ClickedTransition())], ['go']),
              h.div([h.Id(LABEL_ELEMENT_ID)], [model.label]),
            ],
          ),
        container,
        viewTransition: ({ message }) => message._tag === 'ClickedTransition',
      }).start(),
    )

  const nextFrames = (count: number): Promise<void> =>
    new Promise<void>(resolve => {
      const step = (remaining: number): void => {
        if (remaining === 0) {
          resolve()
        } else {
          requestAnimationFrame(() => step(remaining - 1))
        }
      }
      step(count)
    })

  it('stays parked while the transition holds the patch, then reads the patched DOM', async () => {
    // NOTE: captures the update callback without invoking it, so the patch
    // stays outstanding for as long as the test likes. This is the window in
    // which counting animation frames resumes early and reads a stale tree.
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

    const fiber = startElement()

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(LABEL_ELEMENT_ID)?.textContent).toBe(
          'initial',
        )
      })

      document.body.querySelector('button')!.click()

      await vi.waitFor(() => {
        expect(maybeUpdate).not.toBeNull()
      })

      // Frames keep passing with the patch still deferred. A frame-counting
      // waiter has long since resumed and recorded 'initial' by now.
      await nextFrames(3)
      expect(observedLabels).toEqual([])

      maybeUpdate!()

      await vi.waitFor(() => {
        expect(observedLabels).toEqual(['transitioned'])
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('reads the patched DOM when the transition applies the patch promptly', async () => {
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

    const fiber = startElement()

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(LABEL_ELEMENT_ID)?.textContent).toBe(
          'initial',
        )
      })

      document.body.querySelector('button')!.click()

      await vi.waitFor(() => {
        expect(observedLabels).toEqual(['transitioned'])
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('resumes a waiter on a plain render with no transition configured', async () => {
    const fiber = Effect.runFork(
      makeElement({
        Model,
        init: () => ({ model: { label: 'initial' } }),
        update,
        view: model =>
          h.div(
            [],
            [
              h.button([h.OnClick(Message.ClickedTransition())], ['go']),
              h.div([h.Id(LABEL_ELEMENT_ID)], [model.label]),
            ],
          ),
        container,
      }).start(),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(LABEL_ELEMENT_ID)?.textContent).toBe(
          'initial',
        )
      })

      document.body.querySelector('button')!.click()

      await vi.waitFor(() => {
        expect(observedLabels).toEqual(['transitioned'])
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })
})

// A frame that gives up without patching still owes its waiters a resume.
// Without that, a Command gated on `afterCommit` (which is every `Dom` helper)
// parks for the life of the runtime.
describe('a frame that abandons its render', () => {
  let container: HTMLElement

  beforeEach(() => {
    observedLabels = []
    container = document.createElement('div')
    container.id = 'app'
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('resumes waiters when the render itself throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const fiber = Effect.runFork(
      makeElement({
        Model,
        init: () => ({ model: { label: 'initial' } }),
        update,
        view: model => {
          if (model.label === 'transitioned') {
            throw new Error('boom from view')
          }
          return h.div(
            [],
            [
              h.button([h.OnClick(Message.ClickedTransition())], ['go']),
              h.div([h.Id(LABEL_ELEMENT_ID)], [model.label]),
            ],
          )
        },
        container,
        crash: { view: () => h.div([], ['Crashed']) },
      }).start(),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(LABEL_ELEMENT_ID)?.textContent).toBe(
          'initial',
        )
      })

      document.body.querySelector('button')!.click()

      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('Crashed')
      })

      // The probe was already parked on `afterCommit` when the render threw.
      // It has to come back even though the frame produced no patch.
      await vi.waitFor(() => {
        expect(observedLabels).toHaveLength(1)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('does not patch a frame scheduled before the runtime was disposed', async () => {
    const fiber = Effect.runFork(
      makeElement({
        Model,
        init: () => ({ model: { label: 'initial' } }),
        update,
        view: model =>
          h.div(
            [],
            [
              h.button([h.OnClick(Message.ClickedTransition())], ['go']),
              h.div([h.Id(LABEL_ELEMENT_ID)], [model.label]),
            ],
          ),
        container,
      }).start(),
    )

    await vi.waitFor(() => {
      expect(document.getElementById(LABEL_ELEMENT_ID)?.textContent).toBe(
        'initial',
      )
    })

    // Click and dispose within the same task, so the frame is scheduled but
    // has not fired when disposal flips the flag.
    document.body.querySelector('button')!.click()
    await Effect.runPromise(Fiber.interrupt(fiber))

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    expect(document.body.textContent).not.toContain('transitioned')
  })
})
