import { Effect, Match as M, Schema as S } from 'effect'

import * as Command from '../../command'
import { type Html, html } from '../../html'
import { m } from '../../message'
import * as Dialog from '../../ui/dialog'

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

export const Message = S.Union(ClickedToggle, ClickedSubmit, GotDialogMessage)
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
          commands.map(
            Command.mapEffect(
              Effect.map(dialogMessage =>
                GotDialogMessage({ message: dialogMessage }),
              ),
            ),
          ),
        ]
      },
    }),
  )

// VIEW

const { div, button, Class, Disabled, OnClick } = html<Message>()

const submitButton = (isEnabled: boolean): Html =>
  button(
    [
      Class('submit'),
      ...(isEnabled ? [OnClick(ClickedSubmit())] : [Disabled(true)]),
    ],
    ['Submit'],
  )

/** Plain view — no dialog wrapper. */
export const view = (model: Model): Html =>
  div(
    [],
    [
      button([OnClick(ClickedToggle())], ['Toggle']),
      submitButton(model.isEnabled),
    ],
  )

/** View with submit button inside a dialog's panelContent. */
export const viewWithDialog = (model: Model): Html =>
  div(
    [],
    [
      button([OnClick(ClickedToggle())], ['Toggle']),
      Dialog.view({
        model: model.dialog,
        toParentMessage: (dialogMessage): Message =>
          GotDialogMessage({ message: dialogMessage }),
        panelContent: submitButton(model.isEnabled),
      }),
    ],
  )

/** View using Dialog.lazy with panelContent passed dynamically. */
const lazyDialogView = Dialog.lazy<Message>({})

export const viewWithLazyDialog = (model: Model): Html =>
  div(
    [],
    [
      button([OnClick(ClickedToggle())], ['Toggle']),
      lazyDialogView(
        model.dialog,
        (dialogMessage): Message =>
          GotDialogMessage({ message: dialogMessage }),
        submitButton(model.isEnabled),
      ),
    ],
  )
