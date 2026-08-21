import { Match as M, Option, Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import * as Dialog from '../../dialog/index.js'

// MODEL

export const Model = S.Struct({
  isEnabled: S.Boolean,
  dialog: Dialog.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedToggle: {},
  ClickedSubmit: {},
  GotDialogMessage: { message: Dialog.Message },
})
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  isEnabled: false,
  dialog: Dialog.init({ id: 'test-dialog', isOpen: true }),
}

// UPDATE

const foldDialogOutMessage = M.type<Dialog.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => Message.GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedToggle: () => ({ model: { ...model, isEnabled: !model.isEnabled } }),
    ClickedSubmit: () => ({ model }),
    GotDialogMessage: ({ message: dialogMessage }) =>
      foldDialog(model, dialogMessage),
  })

// VIEW

const submitButton = (isEnabled: boolean, h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Class('submit'),
      ...(isEnabled
        ? [h.OnClick(Message.ClickedSubmit())]
        : [h.Disabled(true)]),
    ],
    ['Submit'],
  )

/** Plain view, no dialog wrapper. */
export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
      submitButton(model.isEnabled, h),
    ],
  )
}

/** View with submit button inside a dialog's panel. */
export const viewWithDialog = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
      h.submodel({
        slotId: model.dialog.id,
        model: model.dialog,
        view: Dialog.view,
        viewInputs: {
          toView: ({ dialog, backdrop, panel, isVisible }) =>
            h.dialog(
              [...dialog],
              isVisible
                ? [
                    h.div([...backdrop]),
                    h.div([...panel], [submitButton(model.isEnabled, h)]),
                  ]
                : [],
            ),
        },
        toParentMessage: message => Message.GotDialogMessage({ message }),
      }),
    ],
  )
}
