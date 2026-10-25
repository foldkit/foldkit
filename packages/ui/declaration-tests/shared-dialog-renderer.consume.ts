import type * as Block from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'

import type * as Dialog from '@foldkit/ui/dialog'

import {
  DeleteDialogBinding,
  DeleteIssueBlock,
  DeleteIssueComposition,
  DeleteIssueMessage,
  DeleteIssueModel,
  InviteDialogBinding,
  InviteMemberBlock,
  InviteMemberComposition,
  InviteMemberMessage,
  deleteDialogInputs,
} from './shared-dialog-renderer.accepted.js'
import {
  type RenderDialog,
  confirmDialogInputs,
} from './shared-dialog-renderer.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type SameOwnerParameters = Expect<
  Equal<
    Parameters<typeof deleteDialogInputs>,
    [
      model: typeof DeleteIssueModel.Type,
      h: Block.ViewBuilderFor<typeof DeleteIssueComposition>,
    ]
  >
>
export type SharedRendererAttributes = Expect<
  Equal<Parameters<RenderDialog>[0], Dialog.RenderInfo['dialog']>
>
export type SharedContentBuilder = Expect<
  Equal<
    Parameters<typeof confirmDialogInputs<typeof DeleteIssueMessage.Type>>[0],
    HtmlBuilder<typeof DeleteIssueMessage.Type>
  >
>
export type SharedViewInputs = Expect<
  Equal<ReturnType<typeof confirmDialogInputs>, Dialog.ViewInputs>
>
export type PreservedDeleteIssueModel = Expect<
  Equal<typeof DeleteIssueBlock.Model.Type, typeof DeleteIssueModel.Type>
>

export const relocatedDeleteView = DeleteIssueComposition.makeView((model, h) =>
  h.block(
    DeleteDialogBinding.embedView({
      slotId: 'relocated-delete',
      model: model.dialog,
      viewInputs: deleteDialogInputs(model, h),
    }),
  ),
)

export const relocatedInviteView = InviteMemberComposition.makeView(
  (model, h) =>
    h.block(
      InviteDialogBinding.embedView({
        slotId: 'relocated-invite',
        model: model.dialog,
        viewInputs: confirmDialogInputs(
          h,
          (attributes, children) => h.dialog(attributes, children),
          {
            title: 'Invite member',
            description: `Invite ${model.email}?`,
            confirmMessage: InviteMemberMessage.ClickedSendInvite({
              email: model.email,
            }),
          },
        ),
      }),
    ),
)

export const completedParents = [DeleteIssueBlock, InviteMemberBlock]
