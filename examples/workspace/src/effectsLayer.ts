import { Layer } from 'effect'

import {
  AddIssueComment,
  AssignIssue,
  FailNextIssueSave,
  LoadExternal,
  LoadWorkspace,
  MoveIssue,
  NavigateInternal,
  ReplaceInternalUrl,
} from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  LoadWorkspace.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  ReplaceInternalUrl.layer,
  FailNextIssueSave.layer,
  MoveIssue.layer,
  AddIssueComment.layer,
  AssignIssue.layer,
  subscriptions.layer,
)
