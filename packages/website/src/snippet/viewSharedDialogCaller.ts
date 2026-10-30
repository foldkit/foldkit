import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as Dialog from '@foldkit/ui/dialog'

import { confirmDialogInput } from './viewSharedDialog'

const Message = defineMessageUnion({ ClickedConfirmDeletion: {} })

export class DeleteIssue extends Block<DeleteIssue>()('DeleteIssue', {
  Model: Schema.Struct({ dialog: Dialog.Dialog }),
  Message,
}) {}

export const DeleteIssueLive = DeleteIssue.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', { id: 'delete-issue' })

    return {
      model: { dialog },

      update: {
        ClickedConfirmDeletion: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedClose())],
        }),
      },

      view: (model, h) =>
        model.dialog.view(
          confirmDialogInput(h, {
            title: 'Delete issue',
            description: 'This removes the issue from the project.',
            confirmMessage: Message.ClickedConfirmDeletion(),
          }),
        ),
    }
  }),
)
