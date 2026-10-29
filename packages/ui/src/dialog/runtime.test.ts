import { Array, Effect, Fiber, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Dialog from './block.js'

const dialogId = 'preserved-dialog'

const DialogEvent = Schema.Literals(['Opened', 'Closed'])
type DialogEvent = typeof DialogEvent.Type

const Model = Schema.Struct({
  dialog: Dialog.Model,
  dialogEvents: Schema.Array(DialogEvent),
})
type Model = typeof Model.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: Schema.Never,
})

const foldDialogOutMessage = ApplicationDefinition.makeOutMessageFold(
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

const DialogBinding = ApplicationDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: dialogId }] },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

const ApplicationComposition = ApplicationDefinition.makeComposition({
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

const preservedOpenModel = (config: Dialog.InitConfig): Dialog.Model =>
  Dialog.update(Dialog.init(config).model, Dialog.Message.RequestedOpen()).model

const makeDialogProgram = (container: HTMLElement) => {
  const prepare = () =>
    ApplicationComposition.prepareBlock({
      init,
      update,
      view,
    })
  const block: Block.FromAssemblyWithView<typeof Model, typeof prepare> =
    Block.assemble(prepare)

  return Program.makeElement({
    block,
    container,
  })
}

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
