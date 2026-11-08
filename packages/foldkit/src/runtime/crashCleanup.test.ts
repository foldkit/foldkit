import { Effect, Fiber, Option, Schema, Stream } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import * as Dom from '../dom/index.js'
import { type Html, __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import type { ElementCrashConfig } from './crashUI.js'
import { makeElement } from './makeElement.js'

const Model = Schema.Struct({})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ThrewInUpdate: {},
  SucceededShowDialog: {},
  FailedShowDialog: {},
  CompletedHoldResource: {},
  CompletedTrackPanel: {},
  UnmountedPanel: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()

const CRASH_VIEW_ID = 'crash-view'
const DIALOG_ID = 'owned-dialog'

const ShowDialog = Command.define('ShowDialog', {
  messages: [Message.SucceededShowDialog, Message.FailedShowDialog],
  execute: Dom.showDialog(`#${DIALOG_ID}`, { isModal: true }).pipe(
    Effect.tap(isAcquired => (isAcquired ? Dom.lockScroll : Effect.void)),
    Effect.as(Message.SucceededShowDialog()),
    Effect.catch(() => Effect.succeed(Message.FailedShowDialog())),
  ),
})

const dialogView = (): Html =>
  h.div([], [h.dialog([h.Id(DIALOG_ID)], [h.button([], ['Close'])])])

const crashView = (): Html =>
  h.div([h.Id(CRASH_VIEW_ID)], [h.button([h.Id('crash-reload')], ['Reload'])])

type StartedProgram = Readonly<{
  fiber: Fiber.Fiber<void>
  crash: () => void
  processedTags: ReadonlyArray<Message['_tag']>
}>

const startProgram = async (
  container: HTMLElement,
  config: Readonly<{
    view: () => Html
    commands?: ReadonlyArray<Command.Command<Message>>
    subscriptions?: Subscription.Subscriptions<Model, Message>
    crash?: ElementCrashConfig<Model, Message>
  }>,
): Promise<StartedProgram> => {
  const processedTags: Array<Message['_tag']> = []
  let capturedDispatch: ((message: Message) => void) | null = null

  const program = makeElement({
    Model,
    init: () => ({ model: Model.make({}), commands: config.commands ?? [] }),
    update: (model: Model, message: Message) => {
      processedTags.push(message._tag)
      return Message.match<Update.Return<Model, Message>>(message, {
        ThrewInUpdate: () => {
          throw new Error('boom in update')
        },
        SucceededShowDialog: () => ({ model }),
        FailedShowDialog: () => ({ model }),
        CompletedHoldResource: () => ({ model }),
        CompletedTrackPanel: () => ({ model }),
        UnmountedPanel: () => ({ model }),
      })
    },
    view: () => {
      capturedDispatch = __requireDispatch()
      return config.view()
    },
    subscriptions: config.subscriptions ?? {},
    crash: config.crash ?? { view: crashView },
    container,
  })

  const fiber = Effect.runFork(program.start())
  await vi.waitFor(() => {
    expect(capturedDispatch).not.toBeNull()
  })

  return {
    fiber,
    crash: () => capturedDispatch!(Message.ThrewInUpdate()),
    processedTags,
  }
}

describe('runtime crash cleanup', () => {
  let background: HTMLElement
  let container: HTMLElement

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    background = document.createElement('main')
    background.setAttribute('aria-hidden', 'false')
    container = document.createElement('div')
    container.id = 'crash-cleanup-app'
    document.body.append(background, container)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('releases an open modal dialog, its scroll lock, and the modal observer before rendering the crash view', async () => {
    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog()],
    })
    const disconnectObserver = vi.spyOn(
      MutationObserver.prototype,
      'disconnect',
    )

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(background.getAttribute('aria-hidden')).toBe('true')
        expect(document.documentElement.style.overflow).toBe('hidden')
      })
      const disconnectCount = disconnectObserver.mock.calls.length

      program.crash()

      const crashRoot = document.getElementById(CRASH_VIEW_ID)
      expect(crashRoot).not.toBeNull()
      expect(crashRoot?.inert).toBe(false)
      expect(crashRoot?.hasAttribute('aria-hidden')).toBe(false)
      expect(document.getElementById('crash-reload')?.inert).toBe(false)
      expect(background.inert).toBe(false)
      expect(background.getAttribute('aria-hidden')).toBe('false')
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(disconnectObserver.mock.calls.length).toBeGreaterThan(
        disconnectCount,
      )

      const latePortal = document.createElement('button')
      document.body.appendChild(latePortal)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(latePortal.inert).toBe(false)
      expect(latePortal.hasAttribute('aria-hidden')).toBe(false)

      expect(
        await Effect.runPromise(Dom.releaseDialogResources(DIALOG_ID)),
      ).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('releases a Mount while its element is still in the document', async () => {
    let wasPanelConnectedAtRelease: boolean | undefined

    const TrackPanel = Mount.define('TrackPanel', {
      messages: [Message.CompletedTrackPanel],
      execute: ({ element }) =>
        Effect.acquireRelease(
          Effect.sync(() => ({ panel: element })),
          ({ panel }) =>
            Effect.sync(() => {
              wasPanelConnectedAtRelease = panel.isConnected
            }),
        ).pipe(Effect.as(Message.CompletedTrackPanel())),
    })

    const program = await startProgram(container, {
      view: () => h.div([h.Id('panel'), h.OnMount(TrackPanel())]),
    })

    try {
      await vi.waitFor(() => {
        expect(program.processedTags).toContain('CompletedTrackPanel')
      })

      program.crash()

      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(document.getElementById('panel')).toBeNull()
      expect(wasPanelConnectedAtRelease).toBe(true)
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('runs Command and Subscription finalizers on crash', async () => {
    let isCommandResourceAcquired = false
    let isCommandResourceReleased = false
    let isSubscriptionResourceAcquired = false
    let isSubscriptionResourceReleased = false

    const HoldResource = Command.define('HoldResource', {
      messages: [Message.CompletedHoldResource],
      execute: Effect.scoped(
        Effect.acquireRelease(
          Effect.sync(() => {
            isCommandResourceAcquired = true
          }),
          () =>
            Effect.sync(() => {
              isCommandResourceReleased = true
            }),
        ).pipe(Effect.andThen(Effect.never)),
      ),
    })

    const subscriptions = Subscription.make<Model, Message>()(() => ({
      heldListener: Subscription.persistentEntry(
        Stream.scoped(
          Stream.fromEffect(
            Effect.acquireRelease(
              Effect.sync(() => {
                isSubscriptionResourceAcquired = true
              }),
              () =>
                Effect.sync(() => {
                  isSubscriptionResourceReleased = true
                }),
            ),
          ),
        ).pipe(Stream.flatMap(() => Stream.never)),
      ),
    }))

    const program = await startProgram(container, {
      view: () => h.div([], ['live']),
      commands: [HoldResource()],
      subscriptions,
    })

    try {
      await vi.waitFor(() => {
        expect(isCommandResourceAcquired).toBe(true)
        expect(isSubscriptionResourceAcquired).toBe(true)
      })
      expect(isCommandResourceReleased).toBe(false)
      expect(isSubscriptionResourceReleased).toBe(false)

      program.crash()

      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(isCommandResourceReleased).toBe(true)
      expect(isSubscriptionResourceReleased).toBe(true)
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('renders the crash view when a finalizer throws or dispatches a Message, and hands the release error to crash.report and crash.view', async () => {
    let isFailingResourceAcquired = false
    let didFailingReleaseRun = false
    let maybeReportedReleaseError: Option.Option<Error> | undefined
    let maybeViewedReleaseError: Option.Option<Error> | undefined

    const HoldFailingResource = Command.define('HoldFailingResource', {
      messages: [Message.CompletedHoldResource],
      execute: Effect.scoped(
        Effect.acquireRelease(
          Effect.sync(() => {
            isFailingResourceAcquired = true
          }),
          () =>
            Effect.sync(() => {
              didFailingReleaseRun = true
              throw new Error('release failed')
            }),
        ).pipe(Effect.andThen(Effect.never)),
      ),
    })

    const program = await startProgram(container, {
      view: () =>
        h.div(
          [],
          [
            h.keyed('span')(
              'panel',
              [h.OnUnmount(Message.UnmountedPanel())],
              ['panel'],
            ),
          ],
        ),
      commands: [HoldFailingResource()],
      crash: {
        view: ({ maybeReleaseError }) => {
          maybeViewedReleaseError = maybeReleaseError
          return crashView()
        },
        report: ({ maybeReleaseError }) => {
          maybeReportedReleaseError = maybeReleaseError
        },
      },
    })

    try {
      await vi.waitFor(() => {
        expect(isFailingResourceAcquired).toBe(true)
      })

      program.crash()

      expect(didFailingReleaseRun).toBe(true)
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(maybeReportedReleaseError).toEqual(
        Option.some(new Error('release failed')),
      )
      expect(maybeViewedReleaseError).toEqual(maybeReportedReleaseError)
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(program.processedTags).toEqual(['ThrewInUpdate'])
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('calls crash.report after the release and before the crash view', async () => {
    let reportObservation:
      | Readonly<{
          wasBackgroundInert: boolean
          hadCrashView: boolean
          maybeReleaseError: Option.Option<Error>
        }>
      | undefined

    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog()],
      crash: {
        view: crashView,
        report: ({ maybeReleaseError }) => {
          reportObservation = {
            wasBackgroundInert: background.inert,
            hadCrashView: document.getElementById(CRASH_VIEW_ID) !== null,
            maybeReleaseError,
          }
        },
      },
    })

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
      })

      program.crash()

      expect(reportObservation).toEqual({
        wasBackgroundInert: false,
        hadCrashView: false,
        maybeReleaseError: Option.none(),
      })
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(background.inert).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('restores the container when a crashed runtime is disposed', async () => {
    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog()],
    })

    await vi.waitFor(() => {
      expect(background.inert).toBe(true)
    })

    program.crash()
    expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()

    await Effect.runPromise(Fiber.interrupt(program.fiber))

    expect(document.body.contains(container)).toBe(true)
    expect(document.getElementById(CRASH_VIEW_ID)).toBeNull()
    expect(background.inert).toBe(false)
    expect(document.documentElement.style.overflow).not.toBe('hidden')
  })
})
