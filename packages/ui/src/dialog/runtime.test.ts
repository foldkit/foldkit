import { Array, Effect, Fiber, Layer, Schema } from 'effect'
import { Block, Program, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as TerminalDialogParent from '../test/apps/dialogTerminal.js'
import * as Dialog from './block.js'

const dialogId = 'preserved-dialog'

const DialogEvent = Schema.Literals(['Opened', 'Closed'])
type DialogEvent = typeof DialogEvent.Type

const Model = Schema.Struct({
  dialog: Dialog.DialogBlock.Model,
  dialogEvents: Schema.Array(DialogEvent),
})
type Model = typeof Model.Type

const ApplicationKey = Symbol('DialogRuntimeApplication')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message: Schema.Never,
})

const foldDialogOutMessage = ApplicationBlock.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: () => model => ({
      model: modifyFields(model, {
        dialogEvents: Array.append(DialogEvent.make('Opened')),
      }),
    }),
    Closed: () => model => ({
      model: modifyFields(model, {
        dialogEvents: Array.append(DialogEvent.make('Closed')),
      }),
    }),
    CompletedClose: () => model => ({ model }),
  },
)

const DialogBinding = ApplicationBlock.makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: dialogId }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [DialogBinding],
})

const update = ApplicationComposition.makeUpdate({})

const view = ApplicationComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.p([h.Id('dialog-events')], [model.dialogEvents.join(',')]),
      h.block(
        DialogBinding.embedView({
          slotId: model.dialog.id,
          model: model.dialog,
          viewInputs: {
            toView: ({ dialog, title, panel }) =>
              h.dialog(
                [...dialog],
                [
                  h.div(
                    [...panel],
                    [
                      h.h2([...title], ['Preserved Dialog']),
                      h.button([h.Id('dialog-button')], ['Close']),
                    ],
                  ),
                ],
              ),
          },
        }),
      ),
    ],
  ),
)

const init = ApplicationComposition.makeInit(() => ({
  model: { dialogEvents: [] },
  steps: [DialogBinding.requestOpen()],
}))

const preservedModel = (dialogModel: Dialog.Model): Model => ({
  dialog: dialogModel,
  dialogEvents: [],
})

const preservedOpenModel = (config: Dialog.InitConfig) =>
  Story.withBlock(
    Dialog.DialogBlock,
    dialog =>
      dialog.inMessageUpdate(
        dialog.init(config).model,
        Dialog.InMessage.RequestedOpen(),
      ).model,
  ).pipe(Effect.provide(Dialog.layer))

const application = {
  block: ApplicationBlock,
  layer: ApplicationBlock.makeLayer({
    init,
    update,
    view,
  }).pipe(Layer.provide(Dialog.layer)),
}

const makeDialogProgram = (container: HTMLElement) =>
  Program.makeElement({
    ...application,
    container,
  })

describe('Dialog runtime lifecycle', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
    document.body.innerHTML = ''
  })

  for (const action of ['cancel', 'replace', 'reopen']) {
    it(`drops the old close result when ${action} occurs during native cleanup`, async () => {
      const container = document.createElement('div')
      container.id = `terminal-dialog-${action}`
      document.body.appendChild(container)
      const program = Program.makeElement({
        block: TerminalDialogParent.TerminalDialogParentBlock,
        layer: TerminalDialogParent.layer,
        container,
      })
      const runtime = Effect.runFork(program.start())
      const click = (id: string) => {
        const button = document.getElementById(id)

        if (!(button instanceof HTMLButtonElement)) {
          throw new Error(`Expected button ${id}`)
        }

        button.click()
      }

      try {
        await vi.waitFor(() => {
          expect(document.getElementById('terminal-open')).not.toBeNull()
        })
        click('terminal-open')
        await vi.waitFor(() => {
          expect(
            document.getElementById('first')?.getAttribute('aria-modal'),
          ).toBe('true')
          expect(document.documentElement.style.overflow).toBe('hidden')
        })

        const nativeClose = HTMLDialogElement.prototype.close
        const close = vi
          .spyOn(HTMLDialogElement.prototype, 'close')
          .mockImplementationOnce(function (this: HTMLDialogElement) {
            expect(this.id).toBe('first')
            if (action === 'reopen') {
              click('terminal-cancel')
              click('terminal-open')
            } else {
              click(`terminal-${action}`)
            }
            nativeClose.call(this)
          })
        const closeButton = document.querySelector('#first button')

        if (!(closeButton instanceof HTMLButtonElement)) {
          throw new Error('Expected the current Dialog close button')
        }

        closeButton.click()
        await vi.waitFor(() => {
          expect(close).toHaveBeenCalled()
          expect(
            document.getElementById('terminal-completed')?.textContent,
          ).toBe('')

          if (action === 'cancel') {
            expect(document.getElementById('first')).toBeNull()
            expect(document.documentElement.style.overflow).not.toBe('hidden')
          } else {
            expect(
              document
                .getElementById(action === 'replace' ? 'second' : 'first')
                ?.getAttribute('aria-modal'),
            ).toBe('true')
          }
        })
        await Effect.runPromise(Effect.yieldNow)
        expect(document.getElementById('terminal-completed')?.textContent).toBe(
          '',
        )

        if (action !== 'cancel') {
          expect(
            document
              .getElementById(action === 'replace' ? 'second' : 'first')
              ?.getAttribute('aria-modal'),
          ).toBe('true')
        }
      } finally {
        await Effect.runPromise(Fiber.interrupt(runtime))
      }
    })
  }

  it('reacquires modal resources for a preserved open Model', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'preserved-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = makeDialogProgram(container)
    const encodedOpenModel = Schema.encodeUnknownSync(
      Schema.toCodecJson(Model),
    )(
      preservedModel(
        await Effect.runPromise(preservedOpenModel({ id: dialogId })),
      ),
    )
    const freshRuntime = Effect.runFork(program.start())
    let restoredRuntime: Fiber.Fiber<void, never> | undefined

    try {
      await vi.waitFor(() => {
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.activeElement?.getAttribute('id')).toBe('dialog-button')
        expect(document.querySelector('#dialog-events')?.textContent).toBe(
          'Opened',
        )
      })

      await Effect.runPromise(Fiber.interrupt(freshRuntime))

      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(document.activeElement).toBe(trigger)

      restoredRuntime = Effect.runFork(program.start(encodedOpenModel))

      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.activeElement?.getAttribute('id')).toBe('dialog-button')
        expect(document.querySelector('#dialog-events')?.textContent).toBe('')
      })

      await Effect.runPromise(Fiber.interrupt(restoredRuntime))
      restoredRuntime = undefined

      expect(background.inert).toBe(false)
      expect(document.documentElement.style.overflow).not.toBe('hidden')
      expect(document.activeElement).toBe(trigger)
    } finally {
      await Effect.runPromise(Fiber.interrupt(freshRuntime))
      if (restoredRuntime !== undefined) {
        await Effect.runPromise(Fiber.interrupt(restoredRuntime))
      }
    }
  })

  it('finishes an enter animation restored without its Commands', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'preserved-animated-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = makeDialogProgram(container)
    const encodedEnteringModel = Schema.encodeUnknownSync(
      Schema.toCodecJson(Model),
    )(
      preservedModel(
        await Effect.runPromise(
          preservedOpenModel({ id: dialogId, isAnimated: true }),
        ),
      ),
    )
    const runtime = Effect.runFork(program.start(encodedEnteringModel))

    try {
      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        const panel = document.querySelector(`#${dialogId}-panel`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(panel?.hasAttribute('data-transition')).toBe(false)
        expect(panel?.hasAttribute('data-closed')).toBe(false)
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }

    expect(background.inert).toBe(false)
    expect(document.documentElement.style.overflow).not.toBe('hidden')
    expect(document.activeElement).toBe(trigger)
  })

  it('finishes a leave animation restored without its Commands', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'preserved-leaving-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = makeDialogProgram(container)
    const openModel = await Effect.runPromise(
      preservedOpenModel({ id: dialogId, isAnimated: true }),
    )
    const dialogClose = await Effect.runPromise(
      Story.withBlock(Dialog.DialogBlock, dialog =>
        dialog.inMessageUpdate(openModel, Dialog.InMessage.RequestedClose()),
      ).pipe(Effect.provide(Dialog.layer)),
    )
    const leavingModel = modifyFields(dialogClose.model, {
      animation: animation =>
        modifyFields(animation, { transitionState: () => 'LeaveAnimating' }),
    })
    const encodedLeavingModel = Schema.encodeUnknownSync(
      Schema.toCodecJson(Model),
    )(preservedModel(leavingModel))
    const runtime = Effect.runFork(program.start(encodedLeavingModel))

    try {
      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        const panel = document.querySelector(`#${dialogId}-panel`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.hasAttribute('open')).toBe(false)
        expect(dialog?.hasAttribute('aria-modal')).toBe(false)
        expect(panel?.hasAttribute('data-transition')).toBe(false)
        expect(background.inert).toBe(false)
        expect(document.documentElement.style.overflow).not.toBe('hidden')
        expect(document.activeElement).toBe(trigger)
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })
})
