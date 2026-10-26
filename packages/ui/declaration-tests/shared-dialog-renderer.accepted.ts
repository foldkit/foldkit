import { Schema } from 'effect'
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
export const DeleteIssueDefinition = Block.makeDefinition('DeleteIssue', {
  Model: DeleteIssueModel,
  Message: DeleteIssueMessage,
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
const prepareDeleteIssue = () =>
  DeleteIssueComposition.prepareBlock({
    init: DeleteIssueComposition.makeInit(() => ({
      model: { issueId: 'issue-1' },
    })),
    update: DeleteIssueComposition.makeUpdate({
      ClickedOpenDialog: DeleteDialogBinding.requestOpen(),
      ClickedDeleteIssue: DeleteIssueDefinition.makeNoopStep(),
    }),
    view: deleteIssueView,
  })
export const DeleteIssueBlock: Block.FromAssemblyWithView<
  typeof DeleteIssueModel,
  typeof prepareDeleteIssue
> = Block.assemble(prepareDeleteIssue)

export const InviteMemberModel = Schema.Struct({
  email: Schema.String,
  dialog: Dialog.DialogBlock.Model,
})
export const InviteMemberMessage = defineMessageUnion({
  ClickedOpenDialog: {},
  ClickedSendInvite: { email: Schema.String },
})
export const InviteMemberDefinition = Block.makeDefinition('InviteMember', {
  Model: InviteMemberModel,
  Message: InviteMemberMessage,
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
const prepareInviteMember = () =>
  InviteMemberComposition.prepareBlock({
    init: InviteMemberComposition.makeInit(() => ({
      model: { email: 'member@example.com' },
    })),
    update: InviteMemberComposition.makeUpdate({
      ClickedOpenDialog: InviteDialogBinding.requestOpen(),
      ClickedSendInvite: InviteMemberDefinition.makeNoopStep(),
    }),
    view: inviteMemberView,
  })
export const InviteMemberBlock: Block.FromAssemblyWithView<
  typeof InviteMemberModel,
  typeof prepareInviteMember
> = Block.assemble(prepareInviteMember)
