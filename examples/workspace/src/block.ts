import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

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
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
).provide(
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
)

export const layer = ApplicationBlock.layer
