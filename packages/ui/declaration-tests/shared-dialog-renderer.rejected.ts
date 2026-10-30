import type { HtmlBuilder } from 'foldkit/html'

import * as Dialog from '@foldkit/ui/dialog'

import {
  DeleteIssueMessage,
  type DeleteIssueViewBuilder,
  InviteMemberMessage,
} from './shared-dialog-renderer.accepted.js'
import { confirmDialogInputs } from './shared-dialog-renderer.js'

export const mountFreeInputs = (
  h: HtmlBuilder<typeof DeleteIssueMessage.Type>,
): Dialog.ViewInputs =>
  confirmDialogInputs(
    h,
    (attributes, children) =>
      // @ts-expect-error A Mount-free builder cannot render the Dialog's Mount-bearing Attributes.
      h.dialog(attributes, children),
    {
      title: 'Delete issue',
      description: 'Delete this issue?',
      confirmMessage: DeleteIssueMessage.ClickedDeleteIssue({ issueId: '1' }),
    },
  )

export const crossOwnerInputs = (
  h: DeleteIssueViewBuilder,
): Dialog.ViewInputs =>
  confirmDialogInputs(
    h,
    (attributes, children) => h.dialog(attributes, children),
    {
      title: 'Delete issue',
      description: 'Delete this issue?',
      // @ts-expect-error Shared content cannot send another parent's local Message.
      confirmMessage: InviteMemberMessage.ClickedSendInvite({
        email: 'member@example.com',
      }),
    },
  )

// @ts-expect-error A Dialog view input requires a toView renderer.
export const missingToView: Dialog.ViewInputs = { hasDescription: true }

export const dialogWithoutId = new Dialog.Dialog(
  'dialog',
  // @ts-expect-error Dialog constructor args require the DOM id.
  {},
)
