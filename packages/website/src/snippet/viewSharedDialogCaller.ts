import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog } from '@foldkit/ui'

import { confirmDialogInputs } from './viewSharedDialog'

const Model = Schema.Struct({ dialog: Dialog.DialogBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedConfirmDeletion: {} })
type Message = typeof Message.Type

export const DeleteIssueKey = Symbol('DeleteIssue')
const DeleteIssueBlock = Block.make('DeleteIssue', {
  key: DeleteIssueKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeNoopStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = DeleteIssueBlock

const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'delete-issue' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})
const DeleteIssueComposition = makeComposition({
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
