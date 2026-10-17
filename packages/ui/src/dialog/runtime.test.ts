import { Array, Effect, Fiber, Layer, Schema } from 'effect'
import { Update, defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Dialog from './index.js'

const dialogId = 'preserved-dialog'

const RuntimeMessage = defineMessageUnion({
  GotDialogMessage: { message: Dialog.Message },
})
type RuntimeMessage = typeof RuntimeMessage.Type

const DialogEvent = Schema.Literals(['Opened', 'Closed'])

const Model = Schema.Struct({
  dialog: Dialog.Model,
  dialogEvents: Schema.Array(DialogEvent),
  isShowDialogSucceeded: Schema.Boolean,
})
type Model = typeof Model.Type

const Application = defineApplication({
  Model,
  Message: RuntimeMessage,
})

const foldDialogOutMessage = (outMessage: typeof Dialog.OutMessage.Type) =>
  Application.step(model =>
    Dialog.OutMessage.match(outMessage, {
      Opened: () => ({
        model: modifyFields(model, {
          dialogEvents: Array.append(DialogEvent.make('Opened')),
        }),
      }),
      Closed: () => ({
        model: modifyFields(model, {
          dialogEvents: Array.append(DialogEvent.make('Closed')),
        }),
      }),
    }),
  )

const DialogBinding = Application.bindChild(Dialog.block, {
  field: 'dialog',
  parentMessage: RuntimeMessage.GotDialogMessage,
  fromParentMessage: false,
  outMessage: { fold: foldDialogOutMessage },
  init: { args: () => [{ id: dialogId }] },
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [DialogBinding],
})

const update = ApplicationComposition.makeUpdate((model, message) =>
  RuntimeMessage.match(message, {
    GotDialogMessage: ({ message: dialogMessage }) =>
      Update.combine(model, [
        stepModel => DialogBinding.fold(stepModel, dialogMessage),
        Application.step(stepModel => ({
          model: modifyFields(stepModel, {
            isShowDialogSucceeded: isShowDialogSucceeded =>
              isShowDialogSucceeded ||
              dialogMessage._tag === 'SucceededShowDialog',
          }),
        })),
      ]),
  }),
)

const view = ApplicationComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.p([h.Id('dialog-events')], [model.dialogEvents.join(',')]),
      h.p(
        [h.Id('show-dialog-succeeded')],
        [globalThis.String(model.isShowDialogSucceeded)],
      ),
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
  model: { dialogEvents: [], isShowDialogSucceeded: false },
  steps: [DialogBinding.open()],
}))

const preservedModel = (dialogModel: Dialog.Model): Model => ({
  dialog: dialogModel,
  dialogEvents: [],
  isShowDialogSucceeded: false,
})

const preservedOpenModel = (config: Dialog.InitConfig): Dialog.Model =>
  Dialog.update(Dialog.init(config), Dialog.Message.RequestedOpen()).model

const makeDialogProgram = (container: HTMLElement) =>
  ApplicationComposition.makeElement({
    container,
    init,
    update,
    view,
    EffectsLayer: Layer.empty,
  })

describe('Dialog runtime lifecycle', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
    document.body.innerHTML = ''
  })

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
    )(preservedModel(preservedOpenModel({ id: dialogId })))
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
        expect(
          document.querySelector('#show-dialog-succeeded')?.textContent,
        ).toBe('true')
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
        expect(
          document.querySelector('#show-dialog-succeeded')?.textContent,
        ).toBe('false')
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
    )(preservedModel(preservedOpenModel({ id: dialogId, isAnimated: true })))
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
    const dialogClose = Dialog.update(
      preservedOpenModel({ id: dialogId, isAnimated: true }),
      Dialog.Message.RequestedClose(),
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
