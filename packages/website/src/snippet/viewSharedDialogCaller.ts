import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { DialogBlock } from '@foldkit/ui/dialog'

import { confirmDialogInputs } from './viewSharedDialog'

const Model = Schema.Struct({ dialog: DialogBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedConfirmDeletion: {} })
type Message = typeof Message.Type

export const DeleteIssueKey = Symbol('DeleteIssue')
const DeleteIssueBlock = Block.make('DeleteIssue', {
  key: DeleteIssueKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeNoopStep, makeBinding, makeOutMessageFold, makeComposition } =
  DeleteIssueBlock

const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'delete-issue' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
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
