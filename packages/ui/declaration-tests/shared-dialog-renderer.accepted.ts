import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Dialog from '@foldkit/ui/dialog'

import { confirmDialogInputs } from './shared-dialog-renderer.js'

export const DeleteIssueMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedDeleteIssue: { issueId: Schema.String },
})

export class DeleteIssue extends Block<DeleteIssue>()('DeleteIssue', {
  Model: Schema.Struct({ issueId: Schema.String, dialog: Dialog.Dialog }),
  Message: DeleteIssueMessage,
}) {}

export type DeleteIssueViewBuilder = HtmlBuilder<
  typeof DeleteIssueMessage.Type,
  unknown
>

export const deleteDialogInputs = (
  model: typeof DeleteIssue.Model.Type,
  h: DeleteIssueViewBuilder,
): Dialog.ViewInputs =>
  confirmDialogInputs(
    h,
    (attributes, children) => h.dialog(attributes, children),
    {
      title: 'Delete issue',
      description: `Delete issue ${model.issueId}?`,
      confirmMessage: DeleteIssueMessage.ClickedDeleteIssue({
        issueId: model.issueId,
      }),
    },
  )

export const DeleteIssueLive = DeleteIssue.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'delete-issue-dialog',
    })

    return {
      model: { issueId: 'issue-1', dialog },
      update: {
        ClickedOpenDialog: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
        ClickedDeleteIssue: model => ({ model }),
        ...dialog.on({
          Opened: model => ({ model }),
          Closed: model => ({ model }),
          CompletedClose: model => ({ model }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.OnClick(DeleteIssueMessage.ClickedOpenDialog())],
              ['Delete'],
            ),
            model.dialog.view(deleteDialogInputs(model, h)),
          ],
        ),
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))

export const InviteMemberMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedSendInvite: { email: Schema.String },
})

export class InviteMember extends Block<InviteMember>()('InviteMember', {
  Model: Schema.Struct({ email: Schema.String, dialog: Dialog.Dialog }),
  Message: InviteMemberMessage,
}) {}

export const InviteMemberLive = InviteMember.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'invite-member-dialog',
    })

    return {
      model: { email: 'member@example.com', dialog },
      update: {
        ClickedOpenDialog: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),
        ClickedSendInvite: model => ({ model }),
      },
      view: (model, h) =>
        model.dialog.view(
          confirmDialogInputs(
            h,
            (attributes, children) => h.dialog(attributes, children),
            {
              title: 'Invite member',
              description: `Send an invite to ${model.email}?`,
              confirmMessage: InviteMemberMessage.ClickedSendInvite({
                email: model.email,
              }),
            },
          ),
        ),
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
