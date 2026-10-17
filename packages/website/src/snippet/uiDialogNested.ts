// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

// One Model field per dialog level:
const Model = Schema.Struct({
  settingsDialog: Dialog.Model,
  confirmDialog: Dialog.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// Embed each Dialog Message in your parent Message and delegate each to its
// own Dialog.update (see the basic Dialog example for the delegation).
const Message = defineMessageUnion({
  GotSettingsDialogMessage: { message: Dialog.Message },
  GotConfirmDialogMessage: { message: Dialog.Message },
  ClickedDeleteProject: {},
  ConfirmedDeleteProject: {},
})
type Message = typeof Message.Type

const foldConfirmDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const ProjectDialogs = Block.define('ProjectDialogs', {
  Model,
  Message,
})

const SettingsDialogBinding = ProjectDialogs.bindChild(Dialog.block, {
  field: 'settingsDialog',
  parentMessage: Message.GotSettingsDialogMessage,
  init: { args: () => Tuple.make({ id: 'settings' }) },
  outMessage: { fold: foldConfirmDialogOutMessage },
})

const ConfirmDialogBinding = ProjectDialogs.bindChild(Dialog.block, {
  field: 'confirmDialog',
  parentMessage: Message.GotConfirmDialogMessage,
  init: { args: () => Tuple.make({ id: 'confirm-delete' }) },
  outMessage: { fold: foldConfirmDialogOutMessage },
})

const ProjectDialogsComposition = ProjectDialogs.makeComposition({
  childBindings: [SettingsDialogBinding, ConfirmDialogBinding],
})

const init = ProjectDialogsComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

// Opening the confirmation is a parent fact, not a hand-wrapped child message.
// The button dispatches ClickedDeleteProject; the update opens the confirmation
// through `ConfirmDialogBinding.open()`, keeping Got* for genuine child results.

const update = ProjectDialogsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedDeleteProject: () => ConfirmDialogBinding.open()(model),
    ConfirmedDeleteProject: () => ConfirmDialogBinding.close()(model),
  }),
)

// Each dialog is its own block; the framework stacks them by z-index, traps
// focus in the topmost, and Escape closes the topmost before the one beneath
// it. Cancel dismisses the confirmation through the `closeButton` bundle.
// Delete dispatches a fact that runs the work and closes through
// `ConfirmDialogBinding.close()`.
const view = ProjectDialogsComposition.makeView((model, h) => {
  const confirmDialogView = ({
    dialog,
    backdrop,
    panel,
    title,
    closeButton,
    isVisible,
  }: DialogRenderInfo) =>
    h.dialog(
      [...dialog],
      isVisible
        ? [
            h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
            h.div(
              [...panel, h.Class('rounded-lg p-6 max-w-sm mx-auto shadow-xl')],
              [
                h.h2([...title], ['Delete project?']),
                h.button([...closeButton], ['Cancel']),
                h.button(
                  [h.OnClick(Message.ConfirmedDeleteProject())],
                  ['Delete'],
                ),
              ],
            ),
          ]
        : [],
    )

  const settingsDialogView = ({
    dialog,
    backdrop,
    panel,
    title,
    isVisible,
  }: DialogRenderInfo) =>
    h.dialog(
      [...dialog],
      isVisible
        ? [
            h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
            h.div(
              [...panel, h.Class('rounded-lg p-6 max-w-lg mx-auto shadow-xl')],
              [
                h.h2([...title], ['Project settings']),
                h.button(
                  [h.OnClick(Message.ClickedDeleteProject())],
                  ['Delete project'],
                ),
              ],
            ),
          ]
        : [],
    )

  const confirmDialogViewNode = h.block(
    ConfirmDialogBinding.embedView({
      slotId: model.confirmDialog.id,
      model: model.confirmDialog,
      viewInputs: {
        toView: confirmDialogView,
      },
    }),
  )

  const settingsDialogViewNode = h.block(
    SettingsDialogBinding.embedView({
      slotId: model.settingsDialog.id,
      model: model.settingsDialog,
      viewInputs: {
        toView: settingsDialogView,
      },
    }),
  )

  return h.div([], [settingsDialogViewNode, confirmDialogViewNode])
})
