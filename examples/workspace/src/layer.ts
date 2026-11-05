import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

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
import {
  ActiveMemberListboxBinding,
  CommandPaletteBinding,
  CreateIssueBinding,
  IssueBoardsBinding,
  IssueDetailsBinding,
  IssueListBinding,
  MemberDirectoryBinding,
  NotificationCenterBinding,
  ProjectSettingsBinding,
} from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const activeMember = yield* ActiveMemberListboxBinding
    const projectSettings = yield* ProjectSettingsBinding
    const issueList = yield* IssueListBinding
    const createIssue = yield* CreateIssueBinding
    const issueBoards = yield* IssueBoardsBinding
    const commandPalette = yield* CommandPaletteBinding
    const memberDirectory = yield* MemberDirectoryBinding
    const notificationCenter = yield* NotificationCenterBinding
    const issueDetails = yield* IssueDetailsBinding

    return {
      children: [
        activeMember,
        projectSettings,
        issueList,
        createIssue,
        issueBoards,
        commandPalette,
        memberDirectory,
        notificationCenter,
        issueDetails,
      ],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ListboxLayer,
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
