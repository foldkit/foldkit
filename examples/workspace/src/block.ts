import { Effect, Layer, Tuple } from 'effect'

import * as Listbox from '@foldkit/ui/listbox'

import * as CommandPalette from './commandPalette'
import {
  ActiveMemberBinding,
  CommandPaletteBinding,
  CreateIssueBinding,
  IssueBoardBindingWithOutMessagePolicy,
  IssueDetailBindingWithOutMessagePolicy,
  IssueListBinding,
  MemberDirectoryBinding,
  NotificationCenterBinding,
  ProjectSettingsBinding,
} from './composition'
import * as CreateIssue from './createIssue'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import * as IssueBoard from './issueBoard'
import * as IssueDetail from './issueDetail'
import * as IssueList from './issueList'
import { EffectsLayer } from './layer'
import * as MemberDirectory from './memberDirectory'
import * as NotificationCenter from './notificationCenter'
import * as ProjectSettings from './projectSettings'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const activeMember = yield* ActiveMemberBinding
    const projectSettings = yield* ProjectSettingsBinding
    const issueList = yield* IssueListBinding
    const createIssue = yield* CreateIssueBinding
    const issueBoards = yield* IssueBoardBindingWithOutMessagePolicy
    const commandPalette = yield* CommandPaletteBinding
    const memberDirectory = yield* MemberDirectoryBinding
    const notificationCenter = yield* NotificationCenterBinding
    const issueDetails = yield* IssueDetailBindingWithOutMessagePolicy
    const children = Tuple.make(
      activeMember,
      projectSettings,
      issueList,
      createIssue,
      issueBoards,
      commandPalette,
      memberDirectory,
      notificationCenter,
      issueDetails,
    )
    return { children, init, update, view, subscriptions, EffectsLayer }
  }),
).provide(
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
)

export const layer = ApplicationBlock.layer
