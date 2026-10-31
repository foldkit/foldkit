import { Array, Effect, Fiber, Layer, Schema } from 'effect'
import { Block, Command, Program } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Dialog, DialogLive } from './block.js'

const dialogId = 'started-dialog'

const DialogEvent = Schema.Literals(['Opened', 'Closed'])
type DialogEvent = typeof DialogEvent.Type

const ApplicationMessage = defineMessageUnion({
  CompletedRequestOpenDialog: {},
})

const RequestOpenDialog = Command.define('RequestOpenDialog', {
  messages: [ApplicationMessage.CompletedRequestOpenDialog],
})

class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({
    dialog: Dialog,
    dialogEvents: Schema.Array(DialogEvent),
  }),
  Message: ApplicationMessage,
  Command: [RequestOpenDialog],
}) {}

const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog('dialog', { id: dialogId })

    return {
      model: { dialog, dialogEvents: [] },
      start: [RequestOpenDialog()],
      update: {
        CompletedRequestOpenDialog: model => ({
          model,
          messages: [model.dialog.send(Dialog.Message.RequestedOpen())],
        }),
        ...dialog.on({
          Opened: model => ({
            model: modifyFields(model, {
              dialogEvents: Array.append(DialogEvent.make('Opened')),
            }),
          }),
          Closed: model => ({
            model: modifyFields(model, {
              dialogEvents: Array.append(DialogEvent.make('Closed')),
            }),
          }),
        }),
      },
      commands: {
        RequestOpenDialog: () =>
          Effect.succeed(Application.Message.CompletedRequestOpenDialog()),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.p([h.Id('dialog-events')], [model.dialogEvents.join(',')]),
            model.dialog.view({
              toView: ({ dialog, title, panel }) =>
                h.dialog(
                  [...dialog],
                  [
                    h.div(
                      [...panel],
                      [
                        h.h2([...title], ['Started Dialog']),
                        h.button([h.Id('dialog-button')], ['Close']),
                      ],
                    ),
                  ],
                ),
            }),
          ],
        ),
    }
  }),
)

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

  it('acquires modal resources for a Dialog opened at startup and releases them when the runtime stops', async () => {
    const background = document.createElement('main')
    const trigger = document.createElement('button')
    background.appendChild(trigger)
    const container = document.createElement('div')
    container.id = 'started-dialog-app'
    document.body.append(background, container)
    trigger.focus()

    const program = Program.makeElement(Application, {
      layer: ApplicationLive.pipe(Layer.provide(DialogLive)),
      container,
    })
    const runtime = Effect.runFork(program.start())

    try {
      await vi.waitFor(() => {
        const dialog = document.querySelector(`#${dialogId}`)
        expect(dialog).toBeInstanceOf(HTMLDialogElement)
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(background.inert).toBe(true)
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.activeElement?.getAttribute('id')).toBe('dialog-button')
        expect(document.querySelector('#dialog-events')?.textContent).toBe(
          'Opened',
        )
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }

    expect(background.inert).toBe(false)
    expect(document.documentElement.style.overflow).not.toBe('hidden')
    expect(document.activeElement).toBe(trigger)
  })
})
