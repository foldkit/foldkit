import { Match as M, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import { type Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

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
      GotDialogMessage: ({ message: dialogMessage }) => {
        const [nextDialog, commands] = Dialog.update(
          model.dialog,
          dialogMessage,
        )
        return [
          { ...model, dialog: nextDialog },
          Command.mapMessages(commands, dialogMessage =>
            GotDialogMessage({ message: dialogMessage }),
          ),
        ]
      },
    }),
  )

// VIEW

const submitButton = (isEnabled: boolean): Html => {
  const h = html<Message>()

  return h.button(
    [
      h.Class('submit'),
      ...(isEnabled ? [h.OnClick(ClickedSubmit())] : [h.Disabled(true)]),
    ],
    ['Submit'],
  )
}

/** Plain view, no dialog wrapper. */
export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      h.button([h.OnClick(ClickedToggle())], ['Toggle']),
      submitButton(model.isEnabled),
    ],
  )
}

/** View with submit button inside a dialog's panel. */
export const viewWithDialog = (model: Model): Html => {
  const h = html<Message>()

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
                    h.div([...backdrop], []),
                    h.div([...panel], [submitButton(model.isEnabled)]),
                  ]
                : [],
            ),
        },
        toParentMessage: message => GotDialogMessage({ message }),
      }),
    ],
  )
}
