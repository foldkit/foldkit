import { Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import {
  CommandPalette,
  CreateIssue,
  IssueBoard,
  IssueDetail,
  IssueList,
  MemberDirectory,
  NotificationCenter,
  ProjectSettings,
} from './blocks'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      Listbox.layer,
      CommandPalette.layer,
      CreateIssue.layer,
      IssueList.layer,
      IssueBoard.layer,
      MemberDirectory.layer,
      NotificationCenter.layer,
      IssueDetail.layer,
      ProjectSettings.layer,
    ),
  ),
)
