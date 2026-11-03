import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  DialogBlock,
  layer as DialogLayer,
  type RenderInfo as DialogRenderInfo,
} from '@foldkit/ui/dialog'

// One Model field per dialog level:
const Model = Schema.Struct({
  settingsDialog: DialogBlock.Model,
  confirmDialog: DialogBlock.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// Declare only the parent-owned coordination fact. Each Binding derives its
// own generated Dialog delivery.
const Message = defineMessageUnion({
  ClickedDeleteProject: {},
  ConfirmedDeleteProject: {},
})
type Message = typeof Message.Type

const ProjectDialogsKey = Symbol('ProjectDialogs')

const ProjectDialogsDefinition = Block.makeDefinition('ProjectDialogs', {
  key: ProjectDialogsKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeNoopStep } = ProjectDialogsDefinition

const foldConfirmDialogOutMessage = ProjectDialogsDefinition.makeOutMessageFold(
  DialogBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  },
)

const SettingsDialogBinding = ProjectDialogsDefinition.makeBinding(
  DialogBlock,
  {
    field: 'settingsDialog',
    init: { contextToArgs: () => [{ id: 'settings' }] },
  },
).withOutMessagePolicy({ fold: foldConfirmDialogOutMessage })

const ConfirmDialogBinding = ProjectDialogsDefinition.makeBinding(DialogBlock, {
  field: 'confirmDialog',
  init: { contextToArgs: () => [{ id: 'confirm-delete' }] },
}).withOutMessagePolicy({ fold: foldConfirmDialogOutMessage })

const ProjectDialogsComposition = ProjectDialogsDefinition.makeComposition({
  bindings: [SettingsDialogBinding, ConfirmDialogBinding],
})

const init = ProjectDialogsComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

// Opening the confirmation is a parent fact, not a hand-wrapped child message.
// The button dispatches ClickedDeleteProject; the update opens the confirmation
// through `ConfirmDialogBinding.requestOpen()`, keeping Got* for genuine child results.

const update = ProjectDialogsComposition.makeUpdate({
  ClickedDeleteProject: ConfirmDialogBinding.requestOpen(),
  ConfirmedDeleteProject: ConfirmDialogBinding.requestClose(),
})

// Each dialog is its own block; the framework stacks them by z-index, traps
// focus in the topmost, and Escape closes the topmost before the one beneath
// it. Cancel dismisses the confirmation through the `closeButton` bundle.
// Delete dispatches a fact that runs the work and closes through
// `ConfirmDialogBinding.requestClose()`.
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

export const ApplicationBlock = ProjectDialogsDefinition.makeBlock(
  Effect.gen(function* () {
    const settingsDialog = yield* SettingsDialogBinding
    const confirmDialog = yield* ConfirmDialogBinding

    return {
      children: [settingsDialog, confirmDialog],
      init,
      update,
      view,
    }
  }),
).provide(DialogLayer)
