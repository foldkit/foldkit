import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import * as Dialog from '@foldkit/ui/dialog'

import { confirmDialogInputs } from './shared-dialog-renderer.js'

export const DeleteIssueModel = Schema.Struct({
  issueId: Schema.String,
  dialog: Dialog.DialogBlock.Model,
})
export const DeleteIssueMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedDeleteIssue: { issueId: Schema.String },
})
export const DeleteIssueKey = Symbol('DeleteIssue')
export const DeleteIssueBlock = Block.make('DeleteIssue', {
  key: DeleteIssueKey,
  Model: DeleteIssueModel,
  Message: DeleteIssueMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const DeleteDialogBinding = DeleteIssueBlock.makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'delete-issue-dialog' }] },
  },
).withOutMessagePolicy({
  fold: DeleteIssueBlock.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: DeleteIssueBlock.makeNoopStep,
    Closed: DeleteIssueBlock.makeNoopStep,
    CompletedClose: DeleteIssueBlock.makeNoopStep,
  }),
})
export const DeleteIssueComposition = DeleteIssueBlock.makeComposition({
  bindings: [DeleteDialogBinding],
})
export type DeleteIssueViewBuilder = Block.ViewBuilderFor<
  typeof DeleteIssueComposition
>

export const deleteDialogInputs = (
  model: typeof DeleteIssueModel.Type,
  h: DeleteIssueViewBuilder,
) =>
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

const deleteIssueView = DeleteIssueComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.button([h.OnClick(DeleteIssueMessage.ClickedOpenDialog())], ['Delete']),
      h.block(
        DeleteDialogBinding.embedView({
          slotId: 'delete-issue',
          model: model.dialog,
          viewInputs: deleteDialogInputs(model, h),
        }),
      ),
    ],
  ),
)
export const DeleteIssueLayer = DeleteIssueBlock.makeLayer(
  Effect.gen(function* () {
    const dialog = yield* DeleteDialogBinding

    return {
      children: [dialog],
      init: DeleteIssueComposition.makeInit(() => ({
        model: { issueId: 'issue-1' },
      })),
      update: DeleteIssueComposition.makeUpdate({
        ClickedOpenDialog: DeleteDialogBinding.requestOpen(),
        ClickedDeleteIssue: DeleteIssueBlock.makeNoopStep(),
      }),
      view: deleteIssueView,
    }
  }),
).pipe(Layer.provide(Dialog.layer))

export const InviteMemberModel = Schema.Struct({
  email: Schema.String,
  dialog: Dialog.DialogBlock.Model,
})
export const InviteMemberMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedSendInvite: { email: Schema.String },
})
export const InviteMemberKey = Symbol('InviteMember')
export const InviteMemberBlock = Block.make('InviteMember', {
  key: InviteMemberKey,
  Model: InviteMemberModel,
  Message: InviteMemberMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const InviteDialogBinding = InviteMemberBlock.makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'invite-member-dialog' }] },
  },
).withOutMessagePolicy({
  fold: InviteMemberBlock.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: InviteMemberBlock.makeNoopStep,
    Closed: InviteMemberBlock.makeNoopStep,
    CompletedClose: InviteMemberBlock.makeNoopStep,
  }),
})
export const InviteMemberComposition = InviteMemberBlock.makeComposition({
  bindings: [InviteDialogBinding],
})
export type InviteMemberViewBuilder = Block.ViewBuilderFor<
  typeof InviteMemberComposition
>

const inviteMemberView = InviteMemberComposition.makeView((model, h) =>
  h.block(
    InviteDialogBinding.embedView({
      slotId: 'invite-member',
      model: model.dialog,
      viewInputs: confirmDialogInputs(
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
    }),
  ),
)
export const InviteMemberLayer = InviteMemberBlock.makeLayer(
  Effect.gen(function* () {
    const dialog = yield* InviteDialogBinding

    return {
      children: [dialog],
      init: InviteMemberComposition.makeInit(() => ({
        model: { email: 'member@example.com' },
      })),
      update: InviteMemberComposition.makeUpdate({
        ClickedOpenDialog: InviteDialogBinding.requestOpen(),
        ClickedSendInvite: InviteMemberBlock.makeNoopStep(),
      }),
      view: inviteMemberView,
    }
  }),
).pipe(Layer.provide(Dialog.layer))
