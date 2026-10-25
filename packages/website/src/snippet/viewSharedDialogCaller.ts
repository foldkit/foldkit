import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Dialog from '@foldkit/ui/dialog'

import { confirmDialogInputs } from './viewSharedDialog'

const Model = Schema.Struct({ dialog: Dialog.DialogBlock.Model })
const Message = defineMessageUnion({ ClickedConfirmDeletion: {} })
const DeleteIssueDefinition = Block.makeDefinition('DeleteIssue', {
  Model,
  Message,
})
const DialogBinding = DeleteIssueDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'delete-issue' }] },
}).withOutMessagePolicy({
  fold: DeleteIssueDefinition.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: DeleteIssueDefinition.makeNoopStep,
    Closed: DeleteIssueDefinition.makeNoopStep,
    CompletedClose: DeleteIssueDefinition.makeNoopStep,
  }),
})
const DeleteIssueComposition = DeleteIssueDefinition.makeComposition({
  bindings: [DialogBinding],
})

export const view = DeleteIssueComposition.makeView((model, h) =>
  h.block(
    DialogBinding.embedView({
      slotId: 'delete-issue',
      model: model.dialog,
      viewInputs: confirmDialogInputs(
        h,
        (attributes, children) => h.dialog(attributes, children),
        {
          title: 'Delete issue',
          description: 'This removes the issue from the project.',
          confirmMessage: Message.ClickedConfirmDeletion(),
        },
      ),
    }),
  ),
)
