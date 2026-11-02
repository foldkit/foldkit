import type { Layer } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

import type * as Dialog from '@foldkit/ui/dialog'

import {
  type DeleteIssue,
  DeleteIssueLive,
  type DeleteIssueMessage,
  type DeleteIssueViewBuilder,
  type InviteMember,
  InviteMemberLive,
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
    [model: typeof DeleteIssue.Model.Type, h: DeleteIssueViewBuilder]
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
export type DialogFieldIsInstance = Expect<
  Equal<(typeof DeleteIssue.Model.Type)['dialog'], Dialog.Dialog>
>
export type DeleteIssueLayer = Expect<
  Equal<typeof DeleteIssueLive, Layer.Layer<DeleteIssue>>
>
export type InviteMemberLayer = Expect<
  Equal<typeof InviteMemberLive, Layer.Layer<InviteMember>>
>

export const completedLayers = [DeleteIssueLive, InviteMemberLive]
