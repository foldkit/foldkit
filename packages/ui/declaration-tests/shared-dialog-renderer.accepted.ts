import { Effect, Schema } from 'effect'
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
export const DeleteIssueKey = Symbol('SharedDialogDeleteIssue')
export const DeleteIssueDefinition = Block.makeDefinition('DeleteIssue', {
  key: DeleteIssueKey,
  Model: DeleteIssueModel,
  Message: DeleteIssueMessage,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const DeleteDialogBinding = DeleteIssueDefinition.makeBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'delete-issue-dialog' }] },
  },
).withOutMessagePolicy({
  fold: DeleteIssueDefinition.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: DeleteIssueDefinition.makeNoopStep,
    Closed: DeleteIssueDefinition.makeNoopStep,
    CompletedClose: DeleteIssueDefinition.makeNoopStep,
  }),
})
export const DeleteIssueComposition = DeleteIssueDefinition.makeComposition({
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
export const DeleteIssueBlock = DeleteIssueDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* DeleteDialogBinding

    return {
      children: [dialog],
      init: DeleteIssueComposition.makeInit(() => ({
        model: { issueId: 'issue-1' },
      })),
      update: DeleteIssueComposition.makeUpdate({
        ClickedOpenDialog: DeleteDialogBinding.requestOpen(),
        ClickedDeleteIssue: DeleteIssueDefinition.makeNoopStep(),
      }),
      view: deleteIssueView,
    }
  }),
).provide(Dialog.layer)

export const InviteMemberModel = Schema.Struct({
  email: Schema.String,
  dialog: Dialog.DialogBlock.Model,
})
export const InviteMemberMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedSendInvite: { email: Schema.String },
})
export const InviteMemberKey = Symbol('SharedDialogInviteMember')
export const InviteMemberDefinition = Block.makeDefinition('InviteMember', {
  key: InviteMemberKey,
  Model: InviteMemberModel,
  Message: InviteMemberMessage,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const InviteDialogBinding = InviteMemberDefinition.makeBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'invite-member-dialog' }] },
  },
).withOutMessagePolicy({
  fold: InviteMemberDefinition.makeOutMessageFold(Dialog.DialogBlock, {
    Opened: InviteMemberDefinition.makeNoopStep,
    Closed: InviteMemberDefinition.makeNoopStep,
    CompletedClose: InviteMemberDefinition.makeNoopStep,
  }),
})
export const InviteMemberComposition = InviteMemberDefinition.makeComposition({
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
export const InviteMemberBlock = InviteMemberDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* InviteDialogBinding

    return {
      children: [dialog],
      init: InviteMemberComposition.makeInit(() => ({
        model: { email: 'member@example.com' },
      })),
      update: InviteMemberComposition.makeUpdate({
        ClickedOpenDialog: InviteDialogBinding.requestOpen(),
        ClickedSendInvite: InviteMemberDefinition.makeNoopStep(),
      }),
      view: inviteMemberView,
    }
  }),
).provide(Dialog.layer)
