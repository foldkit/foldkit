import { Deferred, Effect, Fiber, Option, Schema } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Command from '../command/index.js'
import * as Dom from '../dom/index.js'
import { type Html, __htmlBuilder, __requireDispatch } from '../html/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Update from '../update/index.js'
import type { ElementCrashConfig } from './crashUI.js'
import { makeElement } from './makeElement.js'

const Model = Schema.Struct({})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ThrewInUpdate: {},
  CompletedShowDialog: {},
  FailedShowDialog: {},
  CompletedReleaseResource: {},
  CompletedShowFocusDialog: {},
  FailedShowFocusDialog: {},
  CompletedShowDelayedDialog: {},
  FailedShowDelayedDialog: {},
  CompletedLockScrollAfterWait: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()

const CRASH_VIEW_ID = 'crash-view'
const DIALOG_ID = 'owned-dialog'

const ShowDialog = Command.define('ShowDialog', {
  args: { id: Schema.String },
  messages: [Message.CompletedShowDialog, Message.FailedShowDialog],
  execute: ({ id }) =>
    Dom.showDialog(`#${id}`, { isModal: true }).pipe(
      Effect.tap(isAcquired => (isAcquired ? Dom.lockScroll : Effect.void)),
      Effect.as(Message.CompletedShowDialog()),
      Effect.catch(() => Effect.succeed(Message.FailedShowDialog())),
    ),
})

const dialogView = (id = DIALOG_ID): Html =>
  h.div([], [h.dialog([h.Id(id)], [h.button([], ['Close'])])])

const crashView = (): Html =>
  h.div([h.Id(CRASH_VIEW_ID)], [h.button([h.Id('crash-reload')], ['Reload'])])

const startProgram = async (
  container: HTMLElement,
  config: Readonly<{
    view: () => Html
    commands?: ReadonlyArray<Command.Command<Message>>
    crash?: ElementCrashConfig<Model, Message>
  }>,
) => {
  let maybeDispatch = Option.none<(message: Message) => void>()

  const program = makeElement({
    Model,
    init: () => {
      const model = Model.make({})
      const { commands } = config

      if (commands === undefined) {
        return { model }
      } else {
        return { model, commands }
      }
    },
    update: (model: Model, message: Message) =>
      Message.match<Update.Return<Model, Message>>(message, {
        ThrewInUpdate: () => {
          throw new Error('boom in update')
        },
        CompletedShowDialog: () => ({ model }),
        FailedShowDialog: () => ({ model }),
        CompletedReleaseResource: () => ({ model }),
        CompletedShowFocusDialog: () => ({ model }),
        FailedShowFocusDialog: () => ({ model }),
        CompletedShowDelayedDialog: () => ({ model }),
        FailedShowDelayedDialog: () => ({ model }),
        CompletedLockScrollAfterWait: () => ({ model }),
      }),
    view: () => {
      maybeDispatch = Option.some(__requireDispatch())
      return config.view()
    },
    crash: config.crash ?? { view: crashView },
    container,
  })

  const fiber = Effect.runFork(program.start())
  await vi.waitFor(() => {
    expect(Option.isSome(maybeDispatch)).toBe(true)
  })

  return {
    fiber,
    crash: () => Option.getOrThrow(maybeDispatch)(Message.ThrewInUpdate()),
  }
}

describe('modal recovery after a runtime crash', () => {
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

  it('releases owned modal resources before reporting and rendering the crash', async () => {
    let reportObservation:
      | Readonly<{ isBackgroundInert: boolean; hasCrashView: boolean }>
      | undefined

    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog({ id: DIALOG_ID })],
      crash: {
        view: crashView,
        report: () => {
          reportObservation = {
            isBackgroundInert: background.inert,
            hasCrashView: document.getElementById(CRASH_VIEW_ID) !== null,
          }
        },
      },
    })

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
      })

      program.crash()

      expect(reportObservation).toEqual({
        isBackgroundInert: false,
        hasCrashView: false,
      })
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(document.getElementById(CRASH_VIEW_ID)?.inert).toBe(false)
      expect(background.inert).toBe(false)
      expect(background.getAttribute('aria-hidden')).toBe('false')
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(
        await Effect.runPromise(Dom.releaseDialogResources(DIALOG_ID)),
      ).toBe(false)

      const latePortal = document.createElement('button')
      document.body.appendChild(latePortal)
      await new Promise<void>(resolve => queueMicrotask(resolve))
      expect(latePortal.inert).toBe(false)
      expect(latePortal.hasAttribute('aria-hidden')).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('preserves modal resources owned by another running application', async () => {
    const healthyContainer = document.createElement('div')
    healthyContainer.id = 'healthy-app'
    document.body.appendChild(healthyContainer)

    const healthyProgram = await startProgram(healthyContainer, {
      view: dialogView,
      commands: [ShowDialog({ id: DIALOG_ID })],
    })
    const crashingDialogId = 'crashing-dialog'
    const crashingProgram = await startProgram(container, {
      view: () => dialogView(crashingDialogId),
      commands: [ShowDialog({ id: crashingDialogId })],
    })

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(crashingDialogId)).toHaveProperty(
          'open',
          true,
        )
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
      })

      crashingProgram.crash()

      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(background.inert).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')

      const escape = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true,
      })
      document.dispatchEvent(escape)
      expect(escape.defaultPrevented).toBe(true)
      expect(
        await Effect.runPromise(Dom.releaseDialogResources(DIALOG_ID)),
      ).toBe(true)
    } finally {
      await Effect.runPromise(Fiber.interrupt(crashingProgram.fiber))
      await Effect.runPromise(Fiber.interrupt(healthyProgram.fiber))
    }
  })

  it('releases every owned dialog in a modal stack', async () => {
    const secondDialogId = 'second-owned-dialog'
    const program = await startProgram(container, {
      view: () =>
        h.div(
          [],
          [
            h.dialog([h.Id(DIALOG_ID)], [h.button([], ['First'])]),
            h.dialog([h.Id(secondDialogId)], [h.button([], ['Second'])]),
          ],
        ),
      commands: [
        ShowDialog({ id: DIALOG_ID }),
        ShowDialog({ id: secondDialogId }),
      ],
    })

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(secondDialogId)).toHaveProperty(
          'open',
          true,
        )
        expect(document.documentElement.style.overflow).toBe('hidden')
      })

      program.crash()

      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(
        await Effect.runPromise(Dom.releaseDialogResources(DIALOG_ID)),
      ).toBe(false)
      expect(
        await Effect.runPromise(Dom.releaseDialogResources(secondDialogId)),
      ).toBe(false)
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('reports once across repeated crashes and restores the container on disposal', async () => {
    const report = vi.fn()
    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog({ id: DIALOG_ID })],
      crash: { view: crashView, report },
    })

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
      })

      program.crash()
      program.crash()

      expect(report).toHaveBeenCalledTimes(1)
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }

    expect(document.body.contains(container)).toBe(true)
    expect(document.getElementById(CRASH_VIEW_ID)).toBeNull()
    expect(document.documentElement.style.overflow).not.toBe('hidden')
  })

  it('reports and renders while a Command finalizer is pending', async () => {
    const releaseGate = await Effect.runPromise(Deferred.make<void>())
    let isReleaseStarted = false
    const report = vi.fn()

    const ReleaseResource = Command.define('ReleaseResource', {
      messages: [Message.CompletedReleaseResource],
      execute: Effect.scoped(
        Effect.acquireRelease(Effect.void, () =>
          Effect.sync(() => {
            isReleaseStarted = true
          }).pipe(Effect.andThen(Deferred.await(releaseGate))),
        ).pipe(Effect.as(Message.CompletedReleaseResource())),
      ),
    })

    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog({ id: DIALOG_ID }), ReleaseResource()],
      crash: { view: crashView, report },
    })

    try {
      await vi.waitFor(() => {
        expect(isReleaseStarted).toBe(true)
        expect(background.inert).toBe(true)
      })

      program.crash()

      expect(report).toHaveBeenCalledTimes(1)
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
    } finally {
      await Effect.runPromise(Deferred.succeed(releaseGate, undefined))
      await Effect.runPromise(Fiber.interrupt(program.fiber))
    }
  })

  it('reports and renders when releasing a dialog throws', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const report = vi.fn()
    const releaseError = new Error('focus restoration failed')
    const program = await startProgram(container, {
      view: dialogView,
      commands: [ShowDialog({ id: DIALOG_ID })],
      crash: { view: crashView, report },
    })

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
      })
      vi.spyOn(opener, 'focus').mockImplementation(() => {
        throw releaseError
      })

      program.crash()

      expect(report).toHaveBeenCalledTimes(1)
      expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        '[foldkit] Releasing dialog resources failed:',
        DIALOG_ID,
        releaseError,
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(program.fiber))
      await Effect.runPromise(Dom.unlockScroll)
    }
  })

  it.each(['Native', 'Explicit'])(
    'preserves a sibling scroll lock when %s focus crashes during dialog acquisition',
    async focusPhase => {
      const healthyContainer = document.createElement('div')
      healthyContainer.id = 'healthy-focus-app'
      document.body.appendChild(healthyContainer)
      const healthyProgram = await startProgram(healthyContainer, {
        view: dialogView,
        commands: [ShowDialog({ id: DIALOG_ID })],
      })
      const crashingDialogId = 'focus-crashing-dialog'
      const report = vi.fn()
      let maybeAcquired = Option.none<boolean>()
      const nativeShow = HTMLDialogElement.prototype.show
      vi.spyOn(HTMLDialogElement.prototype, 'show').mockImplementation(
        function (this: HTMLDialogElement) {
          nativeShow.call(this)

          if (this.id === crashingDialogId && focusPhase === 'Native') {
            const target = this.querySelector('button')

            if (target instanceof HTMLElement) {
              target.focus()
            }
          }
        },
      )

      const ShowFocusDialog = Command.define('ShowFocusDialog', {
        messages: [
          Message.CompletedShowFocusDialog,
          Message.FailedShowFocusDialog,
        ],
        execute: Dom.showDialog(`#${crashingDialogId}`, { isModal: true }).pipe(
          Effect.tap(isAcquired => {
            maybeAcquired = Option.some(isAcquired)
            return isAcquired ? Dom.lockScroll : Effect.void
          }),
          Effect.as(Message.CompletedShowFocusDialog()),
          Effect.catch(() => Effect.succeed(Message.FailedShowFocusDialog())),
        ),
      })
      const crashingProgram = await startProgram(container, {
        view: () =>
          h.div(
            [],
            [
              h.dialog(
                [h.Id(crashingDialogId)],
                [
                  h.button(
                    [h.OnFocus(Message.ThrewInUpdate())],
                    ['Crash on focus'],
                  ),
                ],
              ),
            ],
          ),
        commands: [ShowFocusDialog()],
        crash: { view: crashView, report },
      })

      try {
        await vi.waitFor(() => {
          expect(report).toHaveBeenCalledTimes(1)
          expect(maybeAcquired).toEqual(Option.some(false))
        })

        expect(document.getElementById(CRASH_VIEW_ID)).not.toBeNull()
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(
          await Effect.runPromise(Dom.releaseDialogResources(crashingDialogId)),
        ).toBe(false)
        expect(
          await Effect.runPromise(Dom.releaseDialogResources(DIALOG_ID)),
        ).toBe(true)
        expect(background.inert).toBe(false)
        expect(document.documentElement.style.overflow).not.toBe('hidden')
      } finally {
        await Effect.runPromise(Fiber.interrupt(crashingProgram.fiber))
        await Effect.runPromise(Fiber.interrupt(healthyProgram.fiber))
      }
    },
  )

  it('rejects dialog and scroll acquisitions resumed after their runtime crashed', async () => {
    const healthyContainer = document.createElement('div')
    healthyContainer.id = 'healthy-late-app'
    document.body.appendChild(healthyContainer)
    const healthyProgram = await startProgram(healthyContainer, {
      view: dialogView,
      commands: [ShowDialog({ id: DIALOG_ID })],
    })
    const lateDialog = document.createElement('dialog')
    lateDialog.id = 'late-owned-dialog'
    lateDialog.appendChild(document.createElement('button'))
    document.body.appendChild(lateDialog)
    const show = vi.spyOn(lateDialog, 'show')
    const gate = await Effect.runPromise(Deferred.make<void>())
    let isShowWaiting = false
    let isLockWaiting = false
    let isLockResumed = false
    let maybeAcquired = Option.none<boolean>()

    const ShowDelayedDialog = Command.define('ShowDelayedDialog', {
      messages: [
        Message.CompletedShowDelayedDialog,
        Message.FailedShowDelayedDialog,
      ],
      execute: Effect.gen(function* () {
        isShowWaiting = true
        yield* Deferred.await(gate)
        const isAcquired = yield* Dom.showDialog(`#${lateDialog.id}`, {
          isModal: true,
        })
        maybeAcquired = Option.some(isAcquired)

        if (isAcquired) {
          yield* Dom.lockScroll
        }

        return Message.CompletedShowDelayedDialog()
      }).pipe(
        Effect.catch(() => Effect.succeed(Message.FailedShowDelayedDialog())),
      ),
    })
    const LockScrollAfterWait = Command.define('LockScrollAfterWait', {
      messages: [Message.CompletedLockScrollAfterWait],
      execute: Effect.gen(function* () {
        isLockWaiting = true
        yield* Deferred.await(gate)
        yield* Dom.lockScroll
        isLockResumed = true
        return Message.CompletedLockScrollAfterWait()
      }),
    })
    const crashingProgram = await startProgram(container, {
      view: () => h.div([], ['Live application']),
      commands: [ShowDelayedDialog(), LockScrollAfterWait()],
    })

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(isShowWaiting).toBe(true)
        expect(isLockWaiting).toBe(true)
      })

      crashingProgram.crash()
      await Effect.runPromise(Deferred.succeed(gate, undefined))
      await vi.waitFor(() => {
        expect(maybeAcquired).toEqual(Option.some(false))
        expect(isLockResumed).toBe(true)
      })

      expect(show).not.toHaveBeenCalled()
      expect(lateDialog.open).toBe(false)
      expect(background.inert).toBe(true)
      expect(document.documentElement.style.overflow).toBe('hidden')
      expect(
        await Effect.runPromise(Dom.releaseDialogResources(DIALOG_ID)),
      ).toBe(true)
      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
    } finally {
      await Effect.runPromise(Deferred.succeed(gate, undefined))
      await Effect.runPromise(Fiber.interrupt(crashingProgram.fiber))
      await Effect.runPromise(Fiber.interrupt(healthyProgram.fiber))
    }
  })
})
