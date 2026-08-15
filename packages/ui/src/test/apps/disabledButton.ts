import { Match as M, Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
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

export const ClickedToggle = m('ClickedToggle')
export const ClickedSubmit = m('ClickedSubmit')
export const GotDialogMessage = m('GotDialogMessage', {
  message: Dialog.Message,
})

export const Message = S.Union([ClickedToggle, ClickedSubmit, GotDialogMessage])
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
    Opened: () => model => [model, []],
    Closed: () => model => [model, []],
  }),
)

const foldDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.dialog),
  write: (model, nextDialog) => evo(model, { dialog: () => nextDialog }),
  toParentMessage: message => GotDialogMessage({ message }),
  foldOutMessage: foldDialogOutMessage,
})

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedToggle: () => [{ ...model, isEnabled: !model.isEnabled }, []],
      ClickedSubmit: () => [model, []],
      GotDialogMessage: ({ message: dialogMessage }) =>
        foldDialog(model, dialogMessage),
    }),
  )

// VIEW

const submitButton = (isEnabled: boolean, h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Class('submit'),
      ...(isEnabled ? [h.OnClick(ClickedSubmit())] : [h.Disabled(true)]),
    ],
    ['Submit'],
  )

/** Plain view, no dialog wrapper. */
export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button([h.OnClick(ClickedToggle())], ['Toggle']),
      submitButton(model.isEnabled, h),
    ],
  )
}

/** View with submit button inside a dialog's panel. */
export const viewWithDialog = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button([h.OnClick(ClickedToggle())], ['Toggle']),
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
        toParentMessage: message => GotDialogMessage({ message }),
      }),
    ],
  )
}
