import { Schema } from 'effect'
import * as Block from 'foldkit/block'

import type * as Dialog from '@foldkit/ui/dialog'

import {
  DeleteDialogBinding,
  DeleteIssueComposition,
  DeleteIssueMessage,
  DeleteIssueModel,
  InviteMemberMessage,
  deleteDialogInputs,
} from './shared-dialog-renderer.accepted.js'
import { confirmDialogInputs } from './shared-dialog-renderer.js'

const MissingDialogComposition = Block.makeDefinition('MissingDialog', {
  Model: DeleteIssueModel,
  Message: DeleteIssueMessage,
}).makeComposition()

MissingDialogComposition.makeView((model, h) =>
  h.block(
    // @ts-expect-error Owning the child field does not register its Binding.
    DeleteDialogBinding.embedView({
      slotId: 'missing-dialog',
      model: model.dialog,
      viewInputs: { toView: () => h.empty },
    }),
  ),
)

MissingDialogComposition.makeView.withInputs<Dialog.RenderInfo>(
  (_model, render, h) =>
    // @ts-expect-error Dialog Mount-bearing Attributes require the registered capability.
    h.dialog(render.dialog),
)

MissingDialogComposition.makeView((_model, h) => {
  confirmDialogInputs(
    h,
    (attributes, children) =>
      // @ts-expect-error A renderer callback cannot grant the missing Dialog Mount.
      h.dialog(attributes, children),
    {
      title: 'Delete issue',
      description: 'Delete this issue?',
      confirmMessage: DeleteIssueMessage.ClickedDeleteIssue({ issueId: '1' }),
    },
  )

  return h.empty
})

MissingDialogComposition.makeView((model, h) => {
  // @ts-expect-error A same-owner helper retains the exact registered child graph.
  deleteDialogInputs(model, h)

  return h.empty
})

DeleteIssueComposition.makeView((_model, h) => {
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

  return h.empty
})

const MissingMountComposition = Block.makeDefinition('MissingMount', {
  Model: Schema.Struct({}),
  Message: Schema.Never,
}).makeComposition()

MissingMountComposition.makeView.withInputs<Dialog.RenderInfo>(
  (_model, render, h) =>
    // @ts-expect-error An unrelated owner cannot render the child's Mount-bearing Attributes.
    h.dialog(render.dialog),
)
