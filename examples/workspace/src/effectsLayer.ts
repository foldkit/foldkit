import { Layer } from 'effect'

import {
  AppendActivity,
  AssignIssue,
  LoadExternal,
  LoadWorkspace,
  MoveIssue,
  NavigateInternal,
  ReplaceInternalUrl,
  SimulateSaveFailure,
} from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  LoadWorkspace.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  ReplaceInternalUrl.layer,
  SimulateSaveFailure.layer,
  MoveIssue.layer,
  AppendActivity.layer,
  AssignIssue.layer,
  subscriptions.layer,
)
