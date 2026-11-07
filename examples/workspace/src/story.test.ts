import { Array, Effect, Number, Option, Record } from 'effect'
import { AsyncData, Story } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import * as Url from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { DragAndDrop } from '@foldkit/ui'

import { DragAndDropBinding } from './blocks/issueBoard/composition'
import { containerId, draggableId } from './blocks/issueBoard/dragAndDrop'
import {
  IssueDetailBlock,
  draftForDisplay,
  hasConflict,
} from './blocks/issueDetail'
import { CommentComposerBlock } from './blocks/issueDetail/blocks/commentComposer'
import { AddComment } from './blocks/issueDetail/blocks/commentComposer/command'
import { PostState } from './blocks/issueDetail/blocks/commentComposer/model'
import { SaveIssue } from './blocks/issueDetail/command'
import {
  CommentComposerBinding,
  StatusListboxBinding,
} from './blocks/issueDetail/composition'
import { Message as IssueDetailMessage } from './blocks/issueDetail/message'
import { SaveState } from './blocks/issueDetail/model'
import { IssueListBlock } from './blocks/issueList'
import { NotificationCenterBlock } from './blocks/notificationCenter'
import { ProjectSettingsBlock } from './blocks/projectSettings'
import { SaveProject } from './blocks/projectSettings/command'
import { SaveState as ProjectSaveState } from './blocks/projectSettings/model'
import {
  AddIssueComment,
  AssignIssue,
  LoadWorkspace,
  MoveIssue,
  NavigateInternal,
  ReplaceInternalUrl,
} from './command'
import {
  ActiveMemberListboxBinding,
  IssueBoardsBinding,
  IssueDetailsBinding,
  IssueListBinding,
  NotificationCenterBinding,
  ProjectSettingsBinding,
} from './composition'
import { Issue, SavedView, Workspace, initialWorkspace } from './domain'
import { ApplicationBlock, layer } from './index'
import { StatusListboxBlock, StringListboxBlock } from './listbox'
import { Message } from './message'
import { type Model } from './model'
import { loadedWorkspaceModel } from './model.fixture'
import { RepositoryError } from './repository'
import {
  ApplicationRoute,
  defaultIssueFilters,
  issueRouter,
  issuesRouter,
  projectRouter,
  routeToPath,
  savedViewRouter,
  withIssueId,
} from './route'
import {
  effectiveIssueFilters,
  maybeActiveIssueBoard,
  maybeActiveIssueDetail,
  unsavedIssueSummaries,
  visibleWorkspaceAsyncData,
} from './selectors'

const application = { block: ApplicationBlock, layer }

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issueB = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))
const issueC = Option.getOrThrow(Array.get(initialWorkspace.issues, 2))

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const activeIssueDetailModel = (model: Model) =>
  Option.getOrThrow(maybeActiveIssueDetail(model))

const activeIssueBoardModel = (model: Model) =>
  Option.getOrThrow(maybeActiveIssueBoard(model))

const retainedIssueDetailModel = (model: Model, issueId: string) =>
  Option.getOrThrow(Record.get(model.issueDetails, issueId))

const projectSettingsModel = (model: Model, projectId: string) =>
  Option.getOrThrow(Record.get(model.projectSettings, projectId))

describe('workspace navigation', () => {
  it.effect(
    'navigates to a project and returns there after closing an issue',
    () => {
      const projectRoute = ApplicationRoute.Project({
        projectId: issueB.projectId,
      })

      const projectPath = projectRouter({ projectId: issueB.projectId })
      return Story.story(
        application,
        Story.init(url('/')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(
          Message.ClickedLink({
            request: UrlRequest.Internal({ url: url(projectPath) }),
          }),
        ),
        Story.Command.expectExact(
          NavigateInternal({ url: Url.toString(url(projectPath)) }),
        ),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
        Story.message(Message.ChangedUrl({ url: url(projectPath) })),
        Story.message(
          Message.ChangedUrl({
            url: url(routeToPath(withIssueId(projectRoute, issueB.id))),
          }),
        ),
        Story.model(model => {
          expect(model.route).toEqual(
            ApplicationRoute.Project({
              projectId: issueB.projectId,
              issueId: issueB.id,
            }),
          )
          expect(activeIssueDetailModel(model).issueId).toBe(issueB.id)
        }),
        Story.messageIn(
          IssueDetailsBinding,
          issueB.id,
          IssueDetailBlock.Message.ClickedClose(),
        ),
        Story.Command.expectExact(NavigateInternal({ url: projectPath })),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
        Story.message(Message.ChangedUrl({ url: url(projectPath) })),
        Story.model(model => {
          expect(model.route).toEqual(
            ApplicationRoute.Project({ projectId: issueB.projectId }),
          )
          expect(Record.values(model.issueDetails)).toHaveLength(1)
        }),
      )
    },
  )

  it.effect('retains the editor when leaving the issue route', () => {
    return Story.story(
      application,
      Story.init(url(issueRouter({ issueId: issueA.id }))),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.message(Message.ChangedUrl({ url: url('/') })),
      Story.model(model => {
        expect(model.route).toEqual(ApplicationRoute.Issues({}))
        expect(Record.values(model.issueDetails)).toHaveLength(1)
      }),
      Story.Command.expectNone(),
    )
  })

  it.effect(
    'reuses each retained editor when navigating between issues',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedWorkspaceModel(
          issueRouter({ issueId: issueA.id }),
        )

        const issueAEditor = activeIssueDetailModel(initialModel)

        const issueBPath = issueRouter({ issueId: issueB.id })
        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(Message.ChangedUrl({ url: url(issueBPath) })),
          Story.model(model => {
            expect(activeIssueDetailModel(model).issueId).toBe(issueB.id)
            expect(Record.values(model.issueDetails)).toHaveLength(2)
          }),
          Story.message(
            Message.ChangedUrl({
              url: url(issueRouter({ issueId: issueA.id })),
            }),
          ),
          Story.model(model => {
            expect(activeIssueDetailModel(model)).toBe(issueAEditor)
            expect(Record.values(model.issueDetails)).toHaveLength(2)
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect('settles a save while another issue is open', () => {
    const savedIssue = modifyFields(issueA, {
      title: () => 'Saved while another issue is open',
      version: Number.increment,
    })
    return Story.story(
      application,
      Story.init(url(issueRouter({ issueId: issueA.id }))),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.messageIn(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailBlock.Message.UpdatedTitle({
          value: savedIssue.title,
        }),
      ),
      Story.messageIn(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailBlock.Message.SubmittedIssueForm(),
      ),
      Story.message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueB.id })),
        }),
      ),
      Story.model(model =>
        expect(activeIssueDetailModel(model).issueId).toBe(issueB.id),
      ),
      Story.Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          saveResult: Issue.toSaveResult(savedIssue),
          expectedVersion: issueA.version,
        }),
      ),
      Story.model(model => {
        const hiddenEditor = retainedIssueDetailModel(model, issueA.id)

        expect(activeIssueDetailModel(model).issueId).toBe(issueB.id)
        expect(hiddenEditor.saveState).toEqual(SaveState.Idle())
        expect(hiddenEditor.baselineRevision).toEqual(
          Issue.toRevision(savedIssue),
        )
        expect(visibleWorkspaceOf(model).issues).toContainEqual(savedIssue)
        expect(unsavedIssueSummaries(model)).toEqual([])
        expect(model.maybeNotice).toEqual(
          Option.some(`${savedIssue.identifier} saved`),
        )
      }),
      Story.Command.expectNone(),
      Story.messageIn(
        IssueDetailsBinding,
        issueB.id,
        IssueDetailBlock.Message.ClickedClose(),
      ),
      Story.Command.expectExact(NavigateInternal({ url: '/' })),
      Story.Command.resolve(
        NavigateInternal,
        Message.CompletedNavigateInternal(),
      ),
    )
  })

  it.effect('closes a direct issue URL to All issues', () => {
    return Story.story(
      application,
      Story.init(url(issueRouter({ issueId: issueA.id }))),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.messageIn(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailBlock.Message.ClickedClose(),
      ),
      Story.Command.expectExact(NavigateInternal({ url: '/' })),
      Story.Command.resolve(
        NavigateInternal,
        Message.CompletedNavigateInternal(),
      ),
    )
  })

  it.effect(
    'keeps every retained editor byte-identical when the workspace refreshes',
    () => {
      const latestIssueA = modifyFields(issueA, {
        title: () => 'A clean hidden editor receives the refresh',
        version: Number.increment,
      })

      const latestIssueB = modifyFields(issueB, {
        title: () => 'A remote title conflicts with a retained draft',
        version: Number.increment,
      })

      const refreshedWorkspace = modifyFields(initialWorkspace, {
        issues: issues =>
          Array.map(
            Array.filter(issues, issue => issue.id !== issueC.id),
            issue => {
              if (issue.id === issueA.id) {
                return latestIssueA
              }

              if (issue.id === issueB.id) {
                return latestIssueB
              }

              return issue
            },
          ),
      })

      const localTitle = 'Keep this local title'
      return Story.story(
        application,
        Story.init(url(issueRouter({ issueId: issueA.id }))),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueB.id })),
          }),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueB.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: localTitle }),
        ),
        Story.message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueC.id })),
          }),
        ),
        Story.message(Message.ChangedUrl({ url: url('/people') })),
        Story.models(
          Story.steps(
            Story.message(
              Message.SucceededLoadWorkspace({
                workspace: refreshedWorkspace,
              }),
            ),
          ),
          (before, after) => {
            const beforeIssueA = retainedIssueDetailModel(before, issueA.id)
            const beforeIssueB = retainedIssueDetailModel(before, issueB.id)
            const beforeIssueC = retainedIssueDetailModel(before, issueC.id)
            const retainedIssueA = retainedIssueDetailModel(after, issueA.id)
            const retainedIssueB = retainedIssueDetailModel(after, issueB.id)
            const retainedIssueC = retainedIssueDetailModel(after, issueC.id)

            expect(maybeActiveIssueDetail(after)).toEqual(Option.none())
            expect(retainedIssueA).toBe(beforeIssueA)
            expect(retainedIssueB).toBe(beforeIssueB)
            expect(retainedIssueC).toBe(beforeIssueC)

            expect(draftForDisplay(retainedIssueA, latestIssueA)).toEqual(
              Issue.toDraft(latestIssueA),
            )
            expect(hasConflict(retainedIssueA, latestIssueA)).toBe(false)
            expect(draftForDisplay(retainedIssueB, latestIssueB).title).toBe(
              localTitle,
            )
            expect(hasConflict(retainedIssueB, latestIssueB)).toBe(true)
          },
        ),
        Story.Command.expectNone(),
      )
    },
  )
})

const unrelatedIssue = Option.getOrThrow(
  Workspace.findIssue(initialWorkspace, 'issue-104'),
)

const visibleWorkspaceOf = (model: Model) =>
  Option.getOrThrow(AsyncData.getData(visibleWorkspaceAsyncData(model)))

const activeMemberNotifications = (model: Model) =>
  Array.filter(
    model.notificationCenter.notifications,
    notification => notification.recipientId === model.activeMemberId,
  )

describe('workspace notifications', () => {
  it.effect(
    'deduplicates comment notifications and preserves read state across late arrivals',
    () => {
      const body =
        'I checked the latest changes. This is ready for another look.'

      const comment = Issue.Comment.make({
        id: 'activity-comment',
        authorId: 'alex',
        body,
        createdAt: '2026-10-24T12:00:00.000Z',
      })

      const commentedIssue = modifyFields(issueA, {
        comments: Array.append(comment),
      })

      const staleComment = Issue.Comment.make({
        id: 'stale-comment',
        authorId: 'jordan',
        body: 'This older event arrived late.',
        createdAt: '2026-10-23T12:00:00.000Z',
      })

      const staleIssue = modifyFields(issueA, {
        comments: Array.append(staleComment),
      })

      const notificationId = `comment:${comment.id}:maya`
      return Story.story(
        application,
        Story.init(url('/')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(Message.ClickedSimulateActivity()),
        Story.Command.expectExact(
          AddIssueComment({ issueId: issueA.id, authorId: 'alex', body }),
        ),
        Story.Command.resolve(
          AddIssueComment,
          Message.SucceededAddIssueComment({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        Story.model(model => {
          expect(activeMemberNotifications(model)).toEqual([
            expect.objectContaining({
              id: notificationId,
              issueId: issueA.id,
              recipientId: 'maya',
              isRead: false,
            }),
          ])
        }),
        Story.messageIn(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedNotificationReadToggle({
            notificationId,
          }),
        ),
        Story.message(
          Message.SucceededAddIssueComment({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        Story.message(
          Message.SucceededAddIssueComment({
            issueId: staleIssue.id,
            comment: Option.getOrThrow(Array.last(staleIssue.comments)),
          }),
        ),
        Story.model(model => {
          expect(activeMemberNotifications(model)).toEqual([
            expect.objectContaining({
              id: `comment:${staleComment.id}:maya`,
              isRead: false,
            }),
            expect.objectContaining({ id: notificationId, isRead: true }),
          ])

          const visibleIssue = Option.getOrThrow(
            Workspace.findIssue(visibleWorkspaceOf(model), issueA.id),
          )

          expect(visibleIssue).toEqual(Issue.merge(commentedIssue, staleIssue))
          expect(visibleIssue.comments).toContainEqual(staleComment)
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'notifies a new assignee only once for an accepted revision',
    () => {
      const assignedIssue = modifyFields(issueB, {
        version: Number.increment,
        maybeAssigneeId: () => Option.some('maya'),
      })
      const assignment = Message.SucceededAssignIssue({
        saveResult: Issue.toSaveResult(assignedIssue),
        actorId: 'jordan',
        createdAt: '2026-10-24T12:00:00.000Z',
      })
      const notificationId = `assignment:${issueB.id}:${assignedIssue.version}:maya`

      return Story.story(
        application,
        Story.init(url('/')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(assignment),
        Story.messageIn(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedNotificationReadToggle({
            notificationId,
          }),
        ),
        Story.message(assignment),
        Story.message(
          Message.SucceededAssignIssue({
            saveResult: Issue.toSaveResult(issueB),
            actorId: 'jordan',
            createdAt: '2026-10-24T11:00:00.000Z',
          }),
        ),
        Story.model(model => {
          expect(model.notificationCenter.notifications).toEqual([
            expect.objectContaining({ id: notificationId, isRead: true }),
          ])
          expect(
            Workspace.findIssue(visibleWorkspaceOf(model), issueB.id),
          ).toEqual(Option.some(assignedIssue))
        }),
      )
    },
  )

  it.effect(
    'uses the current assignee when an older conflict carries a new comment',
    () => {
      const comment = Issue.Comment.make({
        id: 'comment-delayed-conflict',
        authorId: 'jordan',
        body: 'This comment arrived with an earlier revision.',
        createdAt: '2026-10-24T12:00:00.000Z',
      })
      const conflictIssue = modifyFields(issueB, {
        version: Number.increment,
        comments: Array.append(comment),
      })
      const assignedIssue = modifyFields(issueB, {
        version: () => conflictIssue.version + 1,
        maybeAssigneeId: () => Option.some('maya'),
      })

      return Story.story(
        application,
        Story.init(url(issueRouter({ issueId: issueB.id }))),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueB.id,
          IssueDetailMessage.UpdatedTitle({ value: 'An unsaved title' }),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueB.id,
          IssueDetailMessage.SubmittedIssueForm(),
        ),
        Story.message(
          Message.SucceededAssignIssue({
            saveResult: Issue.toSaveResult(assignedIssue),
            actorId: 'jordan',
            createdAt: '2026-10-24T12:01:00.000Z',
          }),
        ),
        Story.Command.resolve(
          SaveIssue,
          IssueDetailMessage.FailedSaveIssue({
            issueId: issueB.id,
            expectedVersion: issueB.version,
            error: RepositoryError.Conflict({
              issueId: issueB.id,
              expectedVersion: issueB.version,
              actualVersion: conflictIssue.version,
              latestIssue: conflictIssue,
              message: 'The issue changed while saving.',
            }),
          }),
        ),
        Story.model(model => {
          const notifications = model.notificationCenter.notifications

          expect(notifications).toContainEqual(
            expect.objectContaining({
              id: `comment:${comment.id}:maya`,
              recipientId: 'maya',
            }),
          )
          expect(notifications).not.toContainEqual(
            expect.objectContaining({
              id: `comment:${comment.id}:alex`,
            }),
          )
          expect(
            Workspace.findIssue(visibleWorkspaceOf(model), issueB.id),
          ).toEqual(Option.some(Issue.addComment(assignedIssue, comment)))
          expect(activeIssueDetailModel(model).draft.title).toBe(
            'An unsaved title',
          )
        }),
      )
    },
  )

  it.effect(
    'keeps background activity relevant and clears a failed event after assignment succeeds',
    () => {
      const assignedIssue = modifyFields(issueB, {
        version: version => version + 1,
        maybeAssigneeId: () => Option.some('maya'),
      })
      return Story.story(
        application,
        Story.init(url(issueRouter({ issueId: issueB.id }))),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(Message.TickedActivityStream()),
        Story.Command.expectExact(
          AddIssueComment({
            issueId: issueA.id,
            authorId: 'alex',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Story.Command.resolve(
          AddIssueComment,
          Message.FailedAddIssueComment({ error: 'Activity is unavailable.' }),
        ),
        Story.message(Message.TickedActivityStream()),
        Story.Command.resolve(
          AddIssueComment,
          Message.FailedAddIssueComment({
            error: 'Activity is still unavailable.',
          }),
        ),
        Story.message(Message.TickedActivityStream()),
        Story.Command.expectExact(
          AssignIssue({
            issueId: issueB.id,
            draft: modifyFields(Issue.Draft.make(issueB), {
              maybeAssigneeId: () => Option.some('maya'),
            }),
            expectedVersion: issueB.version,
            actorId: 'alex',
          }),
        ),
        Story.Command.resolve(
          AssignIssue,
          Message.SucceededAssignIssue({
            saveResult: Issue.toSaveResult(assignedIssue),
            actorId: 'alex',
            createdAt: '2026-10-24T12:00:00.000Z',
          }),
        ),
        Story.model(model => {
          expect(model.maybeNotice).toEqual(Option.none())
          expect(activeMemberNotifications(model)).toContainEqual(
            expect.objectContaining({
              issueId: issueB.id,
              recipientId: 'maya',
              kind: { _tag: 'Assigned' },
            }),
          )
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'keeps own and unrelated comments outside the active member view',
    () => {
      const ownComment = Issue.Comment.make({
        id: 'own-comment',
        authorId: 'maya',
        body: 'I added more context for the team.',
        createdAt: '2026-10-24T13:00:00.000Z',
      })

      const unrelatedComment = Issue.Comment.make({
        id: 'unrelated-comment',
        authorId: 'alex',
        body: 'The empty state is ready for review.',
        createdAt: '2026-10-24T14:00:00.000Z',
      })

      const ownCommentIssue = modifyFields(issueA, {
        comments: Array.append(ownComment),
      })

      const unrelatedCommentIssue = modifyFields(unrelatedIssue, {
        comments: Array.append(unrelatedComment),
      })
      return Story.story(
        application,
        Story.init(url('/')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(
          Message.SucceededAddIssueComment({
            issueId: ownCommentIssue.id,
            comment: Option.getOrThrow(Array.last(ownCommentIssue.comments)),
          }),
        ),
        Story.message(
          Message.SucceededAddIssueComment({
            issueId: unrelatedCommentIssue.id,
            comment: Option.getOrThrow(
              Array.last(unrelatedCommentIssue.comments),
            ),
          }),
        ),
        Story.model(model => {
          expect(activeMemberNotifications(model)).toEqual([])
          expect(model.notificationCenter.notifications).toContainEqual(
            expect.objectContaining({
              id: `comment:${ownComment.id}:alex`,
              recipientId: 'alex',
            }),
          )
          expect(model.notificationCenter.notifications).toContainEqual(
            expect.objectContaining({
              id: `comment:${unrelatedComment.id}:jordan`,
              recipientId: 'jordan',
            }),
          )
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'isolates read state by member and routes a selected notification',
    () => {
      const comment = Issue.Comment.make({
        id: 'shared-comment',
        authorId: 'jordan',
        body: 'The command menu is ready for another pass.',
        createdAt: '2026-10-24T15:00:00.000Z',
      })

      const commentedIssue = modifyFields(issueA, {
        comments: Array.append(comment),
      })

      const assignedIssue = modifyFields(issueB, {
        version: version => version + 1,
        maybeAssigneeId: () => Option.some('maya'),
      })

      const alexNotificationId = `comment:${comment.id}:alex`
      return Story.story(
        application,
        Story.init(url('/')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(
          Message.SucceededAddIssueComment({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        Story.message(
          Message.SucceededAssignIssue({
            saveResult: Issue.toSaveResult(assignedIssue),
            actorId: 'jordan',
            createdAt: '2026-10-24T15:05:00.000Z',
          }),
        ),
        Story.messageIn(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedMarkAllAsRead({
            recipientId: 'maya',
          }),
        ),
        Story.model((model: Model) => {
          expect(
            Array.every(
              activeMemberNotifications(model),
              notification => notification.isRead,
            ),
          ).toBe(true)
          expect(model.notificationCenter.notifications).toContainEqual(
            expect.objectContaining({
              id: `assignment:${issueB.id}:${assignedIssue.version}:maya`,
              recipientId: 'maya',
              isRead: true,
            }),
          )
          expect(
            Array.some(
              model.notificationCenter.notifications,
              notification =>
                notification.id.startsWith('assignment:') &&
                notification.recipientId !== 'maya',
            ),
          ).toBe(false)
        }),
        Story.messageIn(
          ActiveMemberListboxBinding,
          StringListboxBlock.Message.RequestedSelectItem({ item: 'alex' }),
        ),
        Story.model(model => {
          expect(model.activeMemberId).toBe('alex')
          expect(activeMemberNotifications(model)).toEqual([
            expect.objectContaining({
              id: alexNotificationId,
              isRead: false,
            }),
          ])
        }),
        Story.messageIn(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedNotification({
            notificationId: alexNotificationId,
          }),
        ),
        Story.Command.expectExact(
          NavigateInternal({ url: issuesRouter({ issueId: issueA.id }) }),
        ),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
        Story.model(model => {
          expect(activeMemberNotifications(model)).toEqual([
            expect.objectContaining({
              id: alexNotificationId,
              isRead: true,
            }),
          ])
        }),
      )
    },
  )

  it.effect(
    'preserves a foreground notice when background activity succeeds',
    () => {
      return Effect.gen(function* () {
        return yield* Story.story(
          application,
          Story.given(
            modifyFields(yield* loadedWorkspaceModel(), {
              maybeNotice: () => Option.some('Saved view “My work”'),
            }),
          ),
          Story.message(
            Message.SucceededAddIssueComment({
              issueId: issueA.id,
              comment: Issue.Comment.make({
                id: 'notice-comment',
                authorId: 'alex',
                body: 'Activity',
                createdAt: '2026-10-24T12:00:00.000Z',
              }),
            }),
          ),
          Story.model(model => {
            expect(model.maybeNotice).toEqual(
              Option.some('Saved view “My work”'),
            )
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )
})

describe('workspace project settings', () => {
  const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
  const anotherProject = Option.getOrThrow(
    Array.findFirst(
      initialWorkspace.projects,
      candidate => candidate.id !== project.id,
    ),
  )
  const projectSettingsPath = `/projects/${project.id}/settings`

  it.effect(
    'preserves project edits when the current URL is delivered again',
    () => {
      return Story.story(
        application,
        Story.init(url(projectSettingsPath)),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          ProjectSettingsBinding,
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished project name',
          }),
        ),
        Story.message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
        Story.model(model => {
          expect(projectSettingsModel(model, project.id).draft.name).toBe(
            'Unfinished project name',
          )
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'keeps separate drafts across project switches and workspace refreshes',
    () => {
      return Story.story(
        application,
        Story.init(url(projectSettingsPath)),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          ProjectSettingsBinding,
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished platform work',
          }),
        ),
        Story.message(
          Message.ChangedUrl({
            url: url(`/projects/${anotherProject.id}/settings`),
          }),
        ),
        Story.model(model => {
          expect(
            projectSettingsModel(model, anotherProject.id).draft.name,
          ).toBe(anotherProject.name)
        }),
        Story.message(
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
        Story.model(model => {
          expect(projectSettingsModel(model, project.id).draft.name).toBe(
            'Unfinished platform work',
          )
          expect(Record.values(model.projectSettings)).toHaveLength(2)
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'saves project settings while an unrelated issue move is pending',
    () => {
      return Effect.gen(function* () {
        const savedProject = modifyFields(project, { name: () => 'New name' })

        const initialModel = modifyFields(
          yield* loadedWorkspaceModel(projectSettingsPath),
          {
            issueMoveState: () =>
              Issue.MoveState.Moving({
                issueId: issueA.id,
                status: 'Done',
                insertionIndex: 0,
                expectedVersion: issueA.version,
              }),
          },
        )
        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            ProjectSettingsBinding,
            project.id,
            ProjectSettingsBlock.Message.UpdatedProjectName({
              value: savedProject.name,
            }),
          ),
          Story.messageIn(
            ProjectSettingsBinding,
            project.id,
            ProjectSettingsBlock.Message.SubmittedProjectSettings(),
          ),
          Story.Command.expectExact(SaveProject({ project: savedProject })),
          Story.Command.resolve(
            SaveProject,
            ProjectSettingsBlock.Message.SucceededSaveProject({
              project: savedProject,
            }),
          ),
        )
      })
    },
  )

  it.effect(
    'settles a project save after navigating away without touching another editor',
    () => {
      return Effect.gen(function* () {
        const savedProject = modifyFields(project, {
          name: () => 'Saved while away',
        })

        const initialModel = modifyFields(
          yield* loadedWorkspaceModel(projectSettingsPath),
          {
            issueMoveState: () =>
              Issue.MoveState.Moving({
                issueId: issueA.id,
                status: 'Done',
                insertionIndex: 0,
                expectedVersion: issueA.version,
              }),
            projectSettings: Record.map(model =>
              modifyFields(model, {
                draft: () => ({
                  name: savedProject.name,
                  description: savedProject.description,
                }),
                saveState: () => ProjectSaveState.Saving(),
              }),
            ),
          },
        )
        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(
            Message.ChangedUrl({
              url: url(`/projects/${anotherProject.id}/settings`),
            }),
          ),
          Story.messageIn(
            ProjectSettingsBinding,
            project.id,
            ProjectSettingsBlock.Message.SucceededSaveProject({
              project: savedProject,
            }),
          ),
          Story.model(model => {
            expect(
              projectSettingsModel(model, project.id).savedProject,
            ).toEqual(savedProject)
            expect(
              projectSettingsModel(model, anotherProject.id).draft.name,
            ).toBe(anotherProject.name)
            expect(model.route).toEqual(
              ApplicationRoute.ProjectSettings({
                projectId: anotherProject.id,
              }),
            )
          }),
          Story.message(
            Message.SucceededMoveIssue({
              moveResult: {
                issueId: issueA.id,
                status: 'Done',
                insertionIndex: 0,
                version: issueA.version + 1,
              },
            }),
          ),
          Story.model(model => {
            expect(visibleWorkspaceOf(model).projects).toContainEqual(
              savedProject,
            )
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect('publishes only the project returned by a completed save', () => {
    const savedProject = modifyFields(project, {
      name: () => 'Platform engineering',
    })
    return Story.story(
      application,
      Story.init(url(projectSettingsPath)),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.messageIn(
        ProjectSettingsBinding,
        project.id,
        ProjectSettingsBlock.Message.UpdatedProjectName({
          value: savedProject.name,
        }),
      ),
      Story.messageIn(
        ProjectSettingsBinding,
        project.id,
        ProjectSettingsBlock.Message.SubmittedProjectSettings(),
      ),
      Story.Command.expectExact(SaveProject({ project: savedProject })),
      Story.Command.resolve(
        SaveProject,
        ProjectSettingsBlock.Message.SucceededSaveProject({
          project: savedProject,
        }),
      ),
      Story.model(model => {
        expect(visibleWorkspaceOf(model).projects).toContainEqual(savedProject)
        expect(visibleWorkspaceOf(model).issues).toEqual(
          initialWorkspace.issues,
        )
      }),
    )
  })

  it.effect('does not initialize settings for an unknown project', () => {
    return Story.story(
      application,
      Story.init(url('/projects/missing/settings')),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.model(model => {
        expect(model.projectSettings).toEqual({})
      }),
      Story.Command.expectNone(),
    )
  })
})

describe('Application child policies', () => {
  it.effect('retains one Board instance per project across navigation', () => {
    return Effect.gen(function* () {
      const initialModel = yield* loadedWorkspaceModel(
        '/projects/platform/board',
      )
      const issueBoard = activeIssueBoardModel(initialModel)
      const issue = Option.getOrThrow(
        Array.head(Workspace.issuesForProject(initialWorkspace, 'platform')),
      )

      yield* Story.story(
        application,
        Story.given(initialModel),
        Story.message(
          Message.ChangedUrl({
            url: url(
              routeToPath(
                ApplicationRoute.Board({
                  projectId: 'platform',
                  issueId: issue.id,
                }),
              ),
            ),
          }),
        ),
        Story.model(model => {
          expect(activeIssueBoardModel(model)).toBe(issueBoard)
        }),
        Story.message(
          Message.ChangedUrl({ url: url('/projects/platform/board') }),
        ),
        Story.model(model => {
          expect(activeIssueBoardModel(model)).toBe(issueBoard)
        }),
        Story.message(
          Message.ChangedUrl({ url: url('/projects/experience/board') }),
        ),
        Story.model(model => {
          const activeIssueBoard = activeIssueBoardModel(model)

          expect(Record.get(model.issueBoards, 'experience')).toEqual(
            Option.some(activeIssueBoard),
          )
          expect(activeIssueBoard).not.toBe(issueBoard)
        }),
        Story.message(Message.ChangedUrl({ url: url('/people') })),
        Story.model(model => {
          expect(maybeActiveIssueBoard(model)).toEqual(Option.none())
          expect(Record.values(model.issueBoards)).toHaveLength(2)
        }),
        Story.Command.expectNone(),
      )

      yield* Story.story(
        application,
        Story.init(url('/projects/missing/board')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.model(model => {
          expect(model.issueBoards).toEqual({})
        }),
        Story.Command.expectNone(),
      )
    })
  })

  it.effect(
    'retains a failed move for retry and uses the refreshed revision',
    () => {
      const issue = Option.getOrThrow(
        Array.head(Workspace.issuesForProject(initialWorkspace, 'platform')),
      )

      const latestIssue = modifyFields(issue, {
        title: () => 'A newer revision',
        version: version => version + 1,
      })

      const conflict = Message.FailedMoveIssue({
        issueId: issue.id,
        status: 'Done',
        insertionIndex: 0,
        error: RepositoryError.Conflict({
          issueId: issue.id,
          expectedVersion: issue.version,
          actualVersion: latestIssue.version,
          latestIssue,
          message: 'Reloaded the latest revision.',
        }),
      })
      return Story.story(
        application,
        Story.init(url('/projects/platform/board')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.message(conflict),
        Story.model(model => {
          expect(visibleWorkspaceOf(model).issues).toContainEqual(latestIssue)
          expect(model.issueMoveState).toEqual(
            Issue.MoveState.Failed({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: 'Reloaded the latest revision.',
            }),
          )
        }),
        Story.message(Message.ClickedRetryMove()),
        Story.Command.expectExact(
          MoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: latestIssue.version,
          }),
        ),
        Story.Command.resolve(
          MoveIssue,
          Message.FailedMoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            error: RepositoryError.Unavailable({
              operation: 'MoveIssue',
              message: 'The retry is still unavailable.',
            }),
          }),
        ),
      )
    },
  )

  it.effect(
    'routes Issue List facts through filter Commands and saves the applied filters',
    () => {
      const queriedFilters = Issue.Filters.make({
        ...defaultIssueFilters,
        query: 'keyboard',
      })

      const savedFilters = Issue.Filters.make({
        ...queriedFilters,
        groupBy: 'Project',
      })

      const clearedFilters = Issue.Filters.make({
        ...savedFilters,
        query: '',
      })
      return Story.story(
        application,
        Story.init(url('/')),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          IssueListBinding,
          IssueListBlock.Message.UpdatedQuery({ value: 'keyboard' }),
        ),
        Story.Command.expectExact(
          ReplaceInternalUrl({
            url: issuesRouter({ filters: queriedFilters }),
          }),
        ),
        Story.Command.resolve(
          ReplaceInternalUrl,
          Message.CompletedReplaceInternalUrl(),
        ),
        Story.message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: queriedFilters })),
          }),
        ),
        Story.messageIn(
          IssueListBinding,
          IssueListBlock.Message.UpdatedGrouping({ value: 'Project' }),
        ),
        Story.Command.expectExact(
          NavigateInternal({
            url: issuesRouter({ filters: savedFilters }),
          }),
        ),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
        Story.message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: savedFilters })),
          }),
        ),
        Story.messageIn(
          IssueListBinding,
          IssueListBlock.Message.UpdatedSavedViewName({
            value: 'Keyboard work',
          }),
        ),
        Story.messageIn(
          IssueListBinding,
          IssueListBlock.Message.SubmittedSavedView({
            filters: savedFilters,
          }),
        ),
        Story.model(model => {
          expect(model.savedViews).toEqual([
            SavedView.SavedView.make({
              id: 'view-1',
              name: 'Keyboard work',
              filters: savedFilters,
            }),
          ])
          expect(model.nextSavedViewNumber).toBe(2)
        }),
        Story.messageIn(
          IssueListBinding,
          IssueListBlock.Message.ClickedClearFilters(),
        ),
        Story.Command.expectExact(
          NavigateInternal({
            url: issuesRouter({ filters: clearedFilters }),
          }),
        ),
        Story.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
        Story.message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: clearedFilters })),
          }),
        ),
        Story.model(model => {
          expect(effectiveIssueFilters(model)).toEqual(clearedFilters)
        }),
      )
    },
  )

  it.effect(
    'restores saved filters and preserves explicit URL overrides',
    () => {
      return Effect.gen(function* () {
        const savedFilters = Issue.Filters.make({
          ...defaultIssueFilters,
          query: 'keyboard',
          groupBy: 'Project',
        })

        const savedView = SavedView.SavedView.make({
          id: 'view-1',
          name: 'Keyboard work',
          filters: savedFilters,
        })

        const initialModel = modifyFields(yield* loadedWorkspaceModel(), {
          savedViews: () => [savedView],
          nextSavedViewNumber: () => 2,
        })
        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(Message.ChangedUrl({ url: url('/views/view-1') })),
          Story.model(model => {
            expect(effectiveIssueFilters(model)).toEqual(savedFilters)
          }),
          Story.message(
            Message.ChangedUrl({ url: url('/views/view-1?search=override') }),
          ),
          Story.model(model => {
            expect(effectiveIssueFilters(model)).toEqual(
              Issue.Filters.make({
                ...defaultIssueFilters,
                query: 'override',
              }),
            )
          }),
          Story.message(
            Message.ChangedUrl({ url: url('/views/view-1?filters=1') }),
          ),
          Story.model(model => {
            expect(effectiveIssueFilters(model)).toEqual(defaultIssueFilters)
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect(
    'deletes unrelated and displayed saved views without changing filters',
    () => {
      return Effect.gen(function* () {
        const savedFilters = Issue.Filters.make({
          ...defaultIssueFilters,
          query: 'keyboard',
          groupBy: 'Project',
        })
        const displayedView = SavedView.SavedView.make({
          id: 'view-1',
          name: 'Keyboard work',
          filters: savedFilters,
        })
        const unrelatedView = SavedView.SavedView.make({
          id: 'view-2',
          name: 'Other work',
          filters: defaultIssueFilters,
        })
        const displayedPath = savedViewRouter({
          viewId: displayedView.id,
          filters: savedFilters,
        })
        const issuesPath = issuesRouter({ filters: savedFilters })
        const initialModel = modifyFields(
          yield* loadedWorkspaceModel(displayedPath),
          {
            savedViews: () => [displayedView, unrelatedView],
            nextSavedViewNumber: () => 3,
          },
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(
            Message.ClickedDeleteSavedView({ viewId: unrelatedView.id }),
          ),
          Story.model(model => {
            expect(model.savedViews).toEqual([displayedView])
            expect(model.route).toEqual(
              ApplicationRoute.SavedView({
                viewId: displayedView.id,
                filters: savedFilters,
              }),
            )
            expect(effectiveIssueFilters(model)).toEqual(savedFilters)
          }),
          Story.Command.expectNone(),
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(
            Message.ClickedDeleteSavedView({ viewId: displayedView.id }),
          ),
          Story.model(model => {
            expect(model.savedViews).toEqual([unrelatedView])
            expect(effectiveIssueFilters(model)).toEqual(savedFilters)
          }),
          Story.Command.expectExact(NavigateInternal({ url: issuesPath })),
          Story.Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        )
      })
    },
  )

  it.effect(
    'deleting a saved view behind an issue preserves its filters for close',
    () => {
      return Effect.gen(function* () {
        const savedFilters = Issue.Filters.make({
          ...defaultIssueFilters,
          query: 'keyboard',
          groupBy: 'Project',
        })

        const changedFilters = Issue.Filters.make({
          ...savedFilters,
          query: 'unsaved filters',
        })

        const savedView = SavedView.SavedView.make({
          id: 'view-1',
          name: 'Keyboard work',
          filters: savedFilters,
        })

        const savedViewRoute = ApplicationRoute.SavedView({
          viewId: savedView.id,
          filters: changedFilters,
        })

        const issuePath = routeToPath(withIssueId(savedViewRoute, 'issue-102'))

        const issuesRoute = ApplicationRoute.Issues({
          filters: changedFilters,
        })

        const issuesPath = issuesRouter({ filters: changedFilters })

        const repairedIssuePath = routeToPath(
          withIssueId(issuesRoute, 'issue-102'),
        )

        const initialModel = modifyFields(
          yield* loadedWorkspaceModel(issuePath),
          {
            savedViews: () => [savedView],
            nextSavedViewNumber: () => 2,
          },
        )
        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(
            Message.ClickedDeleteSavedView({ viewId: savedView.id }),
          ),
          Story.Command.expectExact(
            ReplaceInternalUrl({ url: repairedIssuePath }),
          ),
          Story.model(model => {
            expect(model.savedViews).toEqual([])

            expect(model.route).toEqual(
              ApplicationRoute.Issues({
                filters: changedFilters,
                issueId: 'issue-102',
              }),
            )
            expect(effectiveIssueFilters(model)).toEqual(changedFilters)
          }),
          Story.Command.resolve(
            ReplaceInternalUrl,
            Message.CompletedReplaceInternalUrl(),
          ),
          Story.message(Message.ChangedUrl({ url: url(repairedIssuePath) })),
          Story.messageIn(
            IssueDetailsBinding,
            activeIssueDetailModel(initialModel).issueId,
            IssueDetailBlock.Message.ClickedClose(),
          ),
          Story.Command.expectExact(NavigateInternal({ url: issuesPath })),
          Story.Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        )
      })
    },
  )

  it.effect('requests teammate activity from the always-on stream fact', () => {
    return Story.story(
      application,
      Story.init(url('/')),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.message(Message.TickedActivityStream()),
      Story.model(model => {
        expect(model.activityRequestCount).toBe(1)
      }),
      Story.Command.expectExact(
        AddIssueComment({
          issueId: 'issue-101',
          authorId: 'alex',
          body: 'I checked the latest changes. This is ready for another look.',
        }),
      ),
      Story.Command.resolve(
        AddIssueComment,
        Message.FailedAddIssueComment({ error: 'Activity is unavailable.' }),
      ),
    )
  })
})

describe('Issue drafts', () => {
  const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))
  const issueB = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))
  const editedTitle = 'A retained issue title'
  const commentBody = 'Keep this comment while I move around.'

  const url = (path: string) =>
    Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

  const issuePath = (issueId: string) => issueRouter({ issueId })

  const loadedIssueModel = (issueId = issueA.id) =>
    loadedWorkspaceModel(issuePath(issueId))

  const activeIssueDetailModel = (model: Model) =>
    Option.getOrThrow(maybeActiveIssueDetail(model))

  const retainedIssueDetailModel = (model: Model, issueId = issueA.id) =>
    Option.getOrThrow(Record.get(model.issueDetails, issueId))

  const visibleIssue = (model: Model, issueId = issueA.id) =>
    Option.getOrThrow(
      Option.flatMap(
        AsyncData.getData(visibleWorkspaceAsyncData(model)),
        workspace => Workspace.findIssue(workspace, issueId),
      ),
    )

  it.effect(
    'retains field edits and clears the draft indicator when clean',
    () => {
      return Story.story(
        application,
        Story.init(url(issuePath(issueA.id))),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
        ),
        Story.model(model => {
          expect(retainedIssueDetailModel(model)).toMatchObject({
            issueId: issueA.id,
            baselineRevision: Issue.toRevision(issueA),
            draft: modifyFields(Issue.toDraft(issueA), {
              title: () => editedTitle,
            }),
            commentComposer: { body: '' },
          })
          expect(unsavedIssueSummaries(model)).toEqual([
            { issueId: issueA.id, title: editedTitle },
          ])
        }),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: issueA.title }),
        ),
        Story.model(model => expect(unsavedIssueSummaries(model)).toEqual([])),
      )
    },
  )

  it.effect('retains a comment by itself and alongside field edits', () => {
    return Effect.gen(function* () {
      const initialModel = yield* loadedIssueModel()
      return yield* Story.story(
        application,
        Story.given(initialModel),
        Story.messageIn(
          [
            { binding: IssueDetailsBinding, key: issueA.id },
            CommentComposerBinding,
          ],
          CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
        ),
        Story.model(model => {
          expect(retainedIssueDetailModel(model)).toMatchObject({
            issueId: issueA.id,
            baselineRevision: Issue.toRevision(issueA),
            draft: Issue.toDraft(issueA),
            commentComposer: { body: commentBody },
          })
          expect(unsavedIssueSummaries(model)).toEqual([
            { issueId: issueA.id, title: issueA.title },
          ])
        }),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
        ),
        Story.model(model => {
          expect(retainedIssueDetailModel(model).draft.title).toBe(editedTitle)
          expect(retainedIssueDetailModel(model).commentComposer.body).toBe(
            commentBody,
          )
        }),
        Story.messageIn(
          [
            { binding: IssueDetailsBinding, key: issueA.id },
            CommentComposerBinding,
          ],
          CommentComposerBlock.Message.UpdatedBody({ value: '' }),
        ),
        Story.model(model =>
          expect(retainedIssueDetailModel(model).draft.title).toBe(editedTitle),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: issueA.title }),
        ),
        Story.model(model => expect(unsavedIssueSummaries(model)).toEqual([])),
      )
    })
  })

  it.effect(
    'preserves an unsent comment after saving fields and clears a clean draft indicator',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()
        const savedIssue = modifyFields(issueA, {
          title: () => editedTitle,
          version: version => version + 1,
        })

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.SubmittedIssueForm(),
          ),
          Story.Command.resolve(
            SaveIssue,
            IssueDetailMessage.SucceededSaveIssue({
              saveResult: Issue.toSaveResult(savedIssue),
              expectedVersion: issueA.version,
            }),
          ),
          Story.model(model => {
            expect(retainedIssueDetailModel(model)).toMatchObject({
              issueId: savedIssue.id,
              baselineRevision: Issue.toRevision(savedIssue),
              draft: Issue.toDraft(savedIssue),
              commentComposer: { body: commentBody },
            })
          }),
          Story.Command.expectNone(),
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.SubmittedIssueForm(),
          ),
          Story.Command.resolve(
            SaveIssue,
            IssueDetailMessage.SucceededSaveIssue({
              saveResult: Issue.toSaveResult(savedIssue),
              expectedVersion: issueA.version,
            }),
          ),
          Story.model(model =>
            expect(unsavedIssueSummaries(model)).toEqual([]),
          ),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect('preserves retained field edits after a comment succeeds', () => {
    return Effect.gen(function* () {
      const initialModel = yield* loadedIssueModel()

      const savedComment = Issue.Comment.make({
        id: 'comment-retained-draft',
        authorId: initialModel.activeMemberId,
        body: commentBody,
        createdAt: '2026-10-23T12:00:00.000Z',
      })

      const issueWithComment = modifyFields(issueA, {
        comments: Array.append(savedComment),
      })
      return yield* Story.story(
        application,
        Story.given(initialModel),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
        ),
        Story.messageIn(
          [
            { binding: IssueDetailsBinding, key: issueA.id },
            CommentComposerBinding,
          ],
          CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
        ),
        Story.messageIn(
          [
            { binding: IssueDetailsBinding, key: issueA.id },
            CommentComposerBinding,
          ],
          CommentComposerBlock.Message.SubmittedCommentForm({
            authorId: initialModel.activeMemberId,
          }),
        ),
        Story.Command.resolve(
          AddComment,
          CommentComposerBlock.Message.SucceededAddComment({
            comment: Option.getOrThrow(Array.last(issueWithComment.comments)),
          }),
        ),
        Story.model(model => {
          const issueDetail = activeIssueDetailModel(model)
          const retainedIssueDetail = retainedIssueDetailModel(model)

          expect(issueDetail.saveState._tag).toBe('Idle')
          expect(issueDetail.commentComposer.body).toBe('')
          expect(hasConflict(issueDetail, issueWithComment)).toBe(false)

          expect(retainedIssueDetail.baselineRevision).toEqual(
            Issue.toRevision(issueA),
          )
          expect(retainedIssueDetail.draft.title).toBe(editedTitle)
          expect(retainedIssueDetail.commentComposer.body).toBe('')
        }),
        Story.Command.expectNone(),
      )
    })
  })

  it.effect(
    'keeps the newest issue when save and comment successes arrive out of order',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()

        const savedIssue = modifyFields(issueA, {
          title: () => editedTitle,
          version: version => version + 1,
        })

        const savedComment = Issue.Comment.make({
          id: 'comment-after-save',
          authorId: initialModel.activeMemberId,
          body: commentBody,
          createdAt: '2026-10-23T12:02:00.000Z',
        })

        const commentedIssue = modifyFields(savedIssue, {
          comments: Array.append(savedComment),
        })

        const postingModel = modifyFields(initialModel, {
          issueDetails: Record.map(issueDetail =>
            modifyFields(issueDetail, {
              draft: draft => modifyFields(draft, { title: () => editedTitle }),
              saveState: () =>
                SaveState.Saving({ expectedVersion: issueA.version }),
              commentComposer: composer =>
                modifyFields(composer, {
                  body: () => commentBody,
                  postState: () => PostState.Posting(),
                }),
            }),
          ),
        })
        return yield* Story.story(
          application,
          Story.given(postingModel),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.SucceededAddComment({
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.saveState).toEqual({
              _tag: 'Saving',
              expectedVersion: issueA.version,
            })
            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(issueA),
            )
          }),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.SucceededSaveIssue({
              saveResult: Issue.toSaveResult(savedIssue),
              expectedVersion: issueA.version,
            }),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(commentedIssue),
            )
            expect(issueDetail.draft).toEqual(Issue.toDraft(commentedIssue))
            expect(issueDetail.saveState._tag).toBe('Idle')
            expect(issueDetail.commentComposer.body).toBe('')

            expect(visibleIssue(model)).toEqual(commentedIssue)
            expect(unsavedIssueSummaries(model)).toEqual([])
          }),
        )
      })
    },
  )

  it.effect(
    'merges out-of-order comments without losing newer activity',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()

        const activityComment = Issue.Comment.make({
          id: 'comment-newer-activity',
          authorId: 'jordan',
          body: 'This activity arrived after the pending comment was accepted.',
          createdAt: '2026-10-23T12:04:00.000Z',
        })

        const latestIssue = modifyFields(issueA, {
          comments: Array.append(activityComment),
        })

        const postedComment = Issue.Comment.make({
          id: 'comment-older-response',
          authorId: initialModel.activeMemberId,
          body: commentBody,
          createdAt: '2026-10-23T12:03:00.000Z',
        })

        const olderCommentIssue = modifyFields(issueA, {
          comments: Array.append(postedComment),
        })

        const postingModel = modifyFields(initialModel, {
          issueDetails: Record.map(issueDetail =>
            modifyFields(issueDetail, {
              commentComposer: composer =>
                modifyFields(composer, {
                  body: () => commentBody,
                  postState: () => PostState.Posting(),
                }),
            }),
          ),
        })
        return yield* Story.story(
          application,
          Story.given(postingModel),
          Story.message(
            Message.SucceededAddIssueComment({
              issueId: latestIssue.id,
              comment: Option.getOrThrow(Array.last(latestIssue.comments)),
            }),
          ),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.SucceededAddComment({
              comment: Option.getOrThrow(
                Array.last(olderCommentIssue.comments),
              ),
            }),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(latestIssue),
            )
            expect(issueDetail.draft).toEqual(Issue.toDraft(latestIssue))
            expect(issueDetail.commentComposer.body).toBe('')

            expect(visibleIssue(model)).toEqual(
              Issue.merge(latestIssue, olderCommentIssue),
            )
            expect(unsavedIssueSummaries(model)).toEqual([])
          }),
        )
      })
    },
  )

  it.effect(
    'preserves an unsent comment when shared issue data changes',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()

        const activityComment = Issue.Comment.make({
          id: 'comment-observed-activity',
          authorId: 'jordan',
          body: 'An update from another teammate.',
          createdAt: '2026-10-23T12:05:00.000Z',
        })

        const observedIssue = modifyFields(issueA, {
          comments: Array.append(activityComment),
        })
        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.message(
            Message.SucceededAddIssueComment({
              issueId: observedIssue.id,
              comment: Option.getOrThrow(Array.last(observedIssue.comments)),
            }),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(issueA),
            )
            expect(issueDetail.draft).toEqual(Issue.toDraft(issueA))
            expect(issueDetail.commentComposer.body).toBe(commentBody)
            expect(hasConflict(issueDetail, observedIssue)).toBe(false)

            expect(retainedIssueDetailModel(model)).toMatchObject({
              issueId: observedIssue.id,
              baselineRevision: Issue.toRevision(issueA),
              draft: Issue.toDraft(issueA),
              commentComposer: { body: commentBody },
            })
          }),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(issueA),
            )
            expect(issueDetail.draft).toEqual(Issue.toDraft(issueA))
            expect(issueDetail.commentComposer.body).toBe(commentBody)
            expect(hasConflict(issueDetail, observedIssue)).toBe(false)
          }),
        )
      })
    },
  )

  it.effect('saves dirty fields against a newer compatible revision', () => {
    const activityComment = Issue.Comment.make({
      id: 'comment-field-rebase',
      authorId: 'jordan',
      body: 'The editable issue fields did not change.',
      createdAt: '2026-10-23T12:06:00.000Z',
    })

    const observedIssue = modifyFields(issueA, {
      comments: Array.append(activityComment),
      version: Number.increment,
    })
    const savedIssue = modifyFields(observedIssue, {
      title: () => editedTitle,
      version: Number.increment,
    })
    const observedWorkspace = modifyFields(initialWorkspace, {
      issues: Array.map(issue =>
        issue.id === observedIssue.id ? observedIssue : issue,
      ),
    })
    return Story.story(
      application,
      Story.init(url(issuePath(issueA.id))),
      Story.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Story.messageIn(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
      ),
      Story.message(
        Message.SucceededLoadWorkspace({ workspace: observedWorkspace }),
      ),
      Story.model(model => {
        const issueDetail = activeIssueDetailModel(model)
        const retainedIssueDetail = retainedIssueDetailModel(model)

        expect(issueDetail.baselineRevision).toEqual(Issue.toRevision(issueA))
        expect(issueDetail.draft.title).toBe(editedTitle)
        expect(issueDetail.saveState._tag).toBe('Idle')
        expect(hasConflict(issueDetail, observedIssue)).toBe(false)

        expect(retainedIssueDetail.baselineRevision).toEqual(
          Issue.toRevision(issueA),
        )
        expect(retainedIssueDetail.draft.title).toBe(editedTitle)
      }),
      Story.messageIn(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailMessage.SubmittedIssueForm(),
      ),
      Story.Command.expectExact(
        SaveIssue({
          issueId: issueA.id,
          draft: modifyFields(Issue.toDraft(issueA), {
            title: () => editedTitle,
          }),
          expectedVersion: observedIssue.version,
        }),
      ),
      Story.Command.resolve(
        SaveIssue,
        IssueDetailMessage.SucceededSaveIssue({
          saveResult: Issue.toSaveResult(savedIssue),
          expectedVersion: observedIssue.version,
        }),
      ),
    )
  })

  it.effect(
    'refreshes a clean editor before its first text and Listbox edits',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()
        const initialEditor = activeIssueDetailModel(initialModel)
        const renamedIssue = modifyFields(issueA, {
          title: () => 'Canonical title changed before the first edit',
          version: Number.increment,
        })
        const renamedWorkspace = modifyFields(initialWorkspace, {
          issues: Array.map(issue =>
            issue.id === renamedIssue.id ? renamedIssue : issue,
          ),
        })

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(
            Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
          ),
          Story.model(model => {
            expect(activeIssueDetailModel(model)).toBe(initialEditor)
          }),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedDescription({
              value: 'The first local description edit',
            }),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(renamedIssue),
            )
            expect(issueDetail.draft.title).toBe(renamedIssue.title)
            expect(issueDetail.draft.description).toBe(
              'The first local description edit',
            )
            expect(hasConflict(issueDetail, renamedIssue)).toBe(false)
          }),
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(
            Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
          ),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              StatusListboxBinding,
            ],
            StatusListboxBlock.Message.RequestedSelectItem({
              item: 'Done',
            }),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(renamedIssue),
            )
            expect(issueDetail.draft.title).toBe(renamedIssue.title)
            expect(issueDetail.draft.status).toBe('Done')
            expect(hasConflict(issueDetail, renamedIssue)).toBe(false)
          }),
        )
      })
    },
  )

  it.effect(
    'derives retained state when reopening after compatible and conflicting changes',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()
        const activityComment = Issue.Comment.make({
          id: 'comment-closed-rebase',
          authorId: 'jordan',
          body: 'This arrived while the issue editor was closed.',
          createdAt: '2026-10-23T12:07:00.000Z',
        })
        const commentedIssue = modifyFields(issueA, {
          comments: Array.append(activityComment),
        })

        const renamedIssue = modifyFields(issueA, {
          title: () => 'Canonical title changed while the editor was closed',
          version: version => version + 1,
        })
        const renamedWorkspace = modifyFields(initialWorkspace, {
          issues: Array.map(issue =>
            issue.id === renamedIssue.id ? renamedIssue : issue,
          ),
        })

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
          Story.message(
            Message.SucceededAddIssueComment({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(issueA),
            )
            expect(issueDetail.draft.title).toBe(editedTitle)
            expect(issueDetail.commentComposer.body).toBe(commentBody)
            expect(issueDetail.saveState._tag).toBe('Idle')
            expect(hasConflict(issueDetail, commentedIssue)).toBe(false)
          }),
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
          Story.message(
            Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
          ),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(issueA),
            )
            expect(issueDetail.draft).toEqual(Issue.toDraft(issueA))
            expect(draftForDisplay(issueDetail, renamedIssue)).toEqual(
              Issue.toDraft(renamedIssue),
            )
            expect(issueDetail.commentComposer.body).toBe(commentBody)
            expect(issueDetail.saveState._tag).toBe('Idle')
            expect(hasConflict(issueDetail, renamedIssue)).toBe(false)
          }),
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
          Story.message(
            Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
          ),
          Story.message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(issueA),
            )
            expect(issueDetail.draft.title).toBe(editedTitle)
            expect(issueDetail.commentComposer.body).toBe(commentBody)
            expect(issueDetail.saveState).toEqual(SaveState.Idle())
            expect(hasConflict(issueDetail, renamedIssue)).toBe(true)
          }),
        )
      })
    },
  )

  it.effect(
    'discarding or reloading field edits preserves an unsent comment',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedIssueModel()
        const newerIssue = modifyFields(issueA, {
          title: () => 'A newer canonical title',
          version: version => version + 1,
        })

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.ClickedDiscardChanges(),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.draft).toEqual(Issue.toDraft(issueA))
            expect(issueDetail.commentComposer.body).toBe(commentBody)

            expect(retainedIssueDetailModel(model)).toMatchObject({
              issueId: issueA.id,
              baselineRevision: Issue.toRevision(issueA),
              draft: Issue.toDraft(issueA),
              commentComposer: { body: commentBody },
            })
          }),
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            [
              { binding: IssueDetailsBinding, key: issueA.id },
              CommentComposerBinding,
            ],
            CommentComposerBlock.Message.UpdatedBody({ value: commentBody }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
          Story.message(
            Message.SucceededLoadWorkspace({
              workspace: modifyFields(initialWorkspace, {
                issues: Array.map(issue =>
                  issue.id === newerIssue.id ? newerIssue : issue,
                ),
              }),
            }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.ClickedReloadIssue(),
          ),
          Story.model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baselineRevision).toEqual(
              Issue.toRevision(newerIssue),
            )
            expect(issueDetail.draft).toEqual(Issue.toDraft(newerIssue))
            expect(issueDetail.commentComposer.body).toBe(commentBody)
            expect(hasConflict(issueDetail, newerIssue)).toBe(false)

            expect(retainedIssueDetailModel(model)).toMatchObject({
              issueId: newerIssue.id,
              baselineRevision: Issue.toRevision(newerIssue),
              draft: Issue.toDraft(newerIssue),
              commentComposer: { body: commentBody },
            })
          }),
        )
      })
    },
  )
})

describe('Board moves', () => {
  const visibleWorkspaceOf = (model: Model) =>
    Option.getOrThrow(AsyncData.getData(visibleWorkspaceAsyncData(model)))

  const visibleIssueOf = (model: Model, issueId: string) =>
    Option.getOrThrow(Workspace.findIssue(visibleWorkspaceOf(model), issueId))

  const visibleIssueIds = (model: Model) =>
    Array.map(visibleWorkspaceOf(model).issues, issue => issue.id)

  const modelWithPendingIssueMove = (
    initialModel: Model,
    issueId: string,
    status: Issue.Status,
    insertionIndex: number,
  ) => {
    const issue = visibleIssueOf(initialModel, issueId)

    return modifyFields(initialModel, {
      issueMoveState: () =>
        Issue.MoveState.Moving({
          issueId,
          status,
          insertionIndex,
          expectedVersion: issue.version,
        }),
    })
  }

  const withWorkspaceIssue = (model: Model, issue: Issue.Issue) =>
    modifyFields(model, {
      workspaceAsyncData: AsyncData.map(workspace =>
        modifyFields(workspace, {
          issues: Array.map(current =>
            current.id === issue.id ? issue : current,
          ),
        }),
      ),
    })

  it.effect(
    'opens an editor from confirmed fields while a board move is pending',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedWorkspaceModel(
          '/projects/platform/board',
        )

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const movingModel = modelWithPendingIssueMove(
          initialModel,
          issue.id,
          'Done',
          0,
        )

        const title = 'A title edited after a failed move'
        return yield* Story.story(
          application,
          Story.given(movingModel),
          Story.message(
            Message.ChangedUrl({
              url: url(issueRouter({ issueId: issue.id })),
            }),
          ),
          Story.model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe('Done')
            expect(activeIssueDetailModel(model).baselineRevision).toEqual(
              Issue.toRevision(issue),
            )
            expect(activeIssueDetailModel(model).draft).toEqual(
              Issue.toDraft(issue),
            )
          }),
          Story.message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'MoveIssue',
                message: 'Offline',
              }),
            }),
          ),
          Story.model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
            expect(activeIssueDetailModel(model).draft.status).toBe(
              issue.status,
            )
          }),
          Story.messageIn(
            IssueDetailsBinding,
            issue.id,
            IssueDetailBlock.Message.UpdatedTitle({ value: title }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            issue.id,
            IssueDetailBlock.Message.SubmittedIssueForm(),
          ),
          Story.Command.expectExact(
            SaveIssue({
              issueId: issue.id,
              expectedVersion: issue.version,
              draft: modifyFields(Issue.toDraft(issue), {
                title: () => title,
              }),
            }),
          ),
          Story.Command.resolve(
            SaveIssue,
            IssueDetailBlock.Message.SucceededSaveIssue({
              saveResult: Issue.toSaveResult(
                modifyFields(issue, {
                  title: () => title,
                  version: Number.increment,
                }),
              ),
              expectedVersion: issue.version,
            }),
          ),
          Story.model(model => {
            expect(visibleIssueOf(model, issue.id).title).toBe(title)
            expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
          }),
        )
      })
    },
  )

  it.effect(
    'retains a teammate comment between an optimistic move and its rollback',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedWorkspaceModel(
          '/projects/platform/board',
        )

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const teammateComment = Issue.Comment.make({
          id: 'comment-during-move',
          authorId: 'maya',
          body: 'This arrived while the move was being saved.',
          createdAt: '2026-10-24T16:00:00.000Z',
        })

        const commentedIssue = modifyFields(issue, {
          comments: Array.append(teammateComment),
        })

        const itemId = draggableId(issue.id)

        return yield* Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(
            [
              {
                binding: IssueBoardsBinding,
                key: issue.projectId,
              },
              DragAndDropBinding,
            ],
            DragAndDrop.DragAndDropBlock.Message.ActivatedKeyboardDrag({
              itemId,
              containerId: containerId(issue.status),
              index: 0,
            }),
          ),
          Story.messageIn(
            [
              {
                binding: IssueBoardsBinding,
                key: issue.projectId,
              },
              DragAndDropBinding,
            ],
            DragAndDrop.DragAndDropBlock.Message.PressedArrowKey({
              direction: 'NextContainer',
            }),
          ),
          DragAndDrop.test.resolveKeyboardMove({
            binding: DragAndDropBinding,
            itemId,
            targetContainerId: containerId('Done'),
            targetIndex: 0,
          }),
          Story.messageIn(
            [
              {
                binding: IssueBoardsBinding,
                key: issue.projectId,
              },
              DragAndDropBinding,
            ],
            DragAndDrop.DragAndDropBlock.Message.ConfirmedKeyboardDrop(),
          ),
          DragAndDrop.test.settleFocus({
            binding: DragAndDropBinding,
            itemId,
          }),
          Story.model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe('Done')
            expect(
              Option.getOrThrow(AsyncData.getData(model.workspaceAsyncData))
                .issues,
            ).toEqual(initialWorkspace.issues)

            expect(activeIssueBoardModel(model).announcement).toBe(
              'Moved to Done, position 1.',
            )
          }),
          Story.Command.expectExact(
            MoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              expectedVersion: issue.version,
            }),
          ),
          Story.message(
            Message.SucceededAddIssueComment({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
          Story.model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe('Done')
            expect(visibleIssueOf(model, issue.id).comments).toContainEqual(
              teammateComment,
            )
            const confirmedWorkspace = Option.getOrThrow(
              AsyncData.getData(model.workspaceAsyncData),
            )
            expect(
              Array.map(confirmedWorkspace.issues, issue => issue.id),
            ).toEqual(Array.map(initialWorkspace.issues, issue => issue.id))
            expect(Workspace.findIssue(confirmedWorkspace, issue.id)).toEqual(
              Option.some(commentedIssue),
            )
          }),
          Story.Command.expectExact(
            MoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              expectedVersion: issue.version,
            }),
          ),
          Story.Command.resolve(
            MoveIssue,
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'MoveIssue',
                message: 'Offline',
              }),
            }),
          ),
          Story.model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
            expect(visibleIssueOf(model, issue.id).comments).toContainEqual(
              teammateComment,
            )

            expect(activeIssueBoardModel(model).announcement).toBe(
              'Could not save the move. Issue position restored.',
            )
          }),
        )
      })
    },
  )

  it.effect(
    'restores the original same-column placement and preserves a concurrent comment',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedWorkspaceModel(
          '/projects/platform/board',
        )

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const movingModel = modelWithPendingIssueMove(
          initialModel,
          issue.id,
          issue.status,
          1,
        )

        const commentedIssue = modifyFields(issue, {
          comments: Array.append({
            id: 'comment-review',
            authorId: 'maya',
            body: 'Keep this comment when the move fails.',
            createdAt: '2026-10-22T12:00:00.000Z',
          }),
        })

        expect(visibleIssueIds(movingModel)).not.toEqual(
          visibleIssueIds(initialModel),
        )
        return yield* Story.story(
          application,
          Story.given(withWorkspaceIssue(movingModel, commentedIssue)),
          Story.message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: issue.status,
              insertionIndex: 1,
              error: RepositoryError.Unavailable({
                operation: 'MoveIssue',
                message: 'The move could not be saved.',
              }),
            }),
          ),
          Story.model(model => {
            expect(visibleIssueIds(model)).toEqual(
              visibleIssueIds(initialModel),
            )
            expect(visibleIssueOf(model, issue.id)).toEqual(commentedIssue)
            expect(Issue.MoveState.guards.Failed(model.issueMoveState)).toBe(
              true,
            )
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect(
    'preserves concurrent issue edits and unrelated rows when restoring the original global position',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedWorkspaceModel(
          '/projects/platform/board',
        )

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const unrelatedIssue = visibleIssueOf(initialModel, 'issue-101')

        const movingModel = modelWithPendingIssueMove(
          initialModel,
          issue.id,
          'Done',
          0,
        )

        const editedIssue = modifyFields(issue, {
          title: () => 'A teammate updated this issue',
          status: () => 'Todo',
          projectId: () => 'experience',
          version: Number.increment,
        })

        const commentedUnrelatedIssue = modifyFields(unrelatedIssue, {
          comments: Array.append({
            id: 'comment-other-issue',
            authorId: 'alex',
            body: 'An unrelated update must survive.',
            createdAt: '2026-10-22T12:01:00.000Z',
          }),
        })

        expect(visibleIssueOf(movingModel, issue.id).status).toBe('Done')
        return yield* Story.story(
          application,
          Story.given(
            withWorkspaceIssue(
              withWorkspaceIssue(movingModel, editedIssue),
              commentedUnrelatedIssue,
            ),
          ),
          Story.message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'MoveIssue',
                message: 'The move could not be saved.',
              }),
            }),
          ),
          Story.model(model => {
            expect(visibleIssueIds(model)).toEqual(
              visibleIssueIds(initialModel),
            )
            expect(visibleIssueOf(model, issue.id)).toEqual(editedIssue)
            expect(visibleIssueOf(model, unrelatedIssue.id)).toEqual(
              commentedUnrelatedIssue,
            )
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )

  it.effect(
    'restores placement before applying the canonical issue from a conflict result',
    () => {
      return Effect.gen(function* () {
        const initialModel = yield* loadedWorkspaceModel(
          '/projects/platform/board',
        )

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const movingModel = modelWithPendingIssueMove(
          initialModel,
          issue.id,
          'Done',
          0,
        )

        const latestIssue = modifyFields(issue, {
          title: () => 'A newer canonical title',
          status: () => 'InProgress',
          version: Number.increment,
        })
        return yield* Story.story(
          application,
          Story.given(movingModel),
          Story.message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Conflict({
                issueId: issue.id,
                expectedVersion: issue.version,
                actualVersion: latestIssue.version,
                latestIssue,
                message: 'The issue changed before it could be moved.',
              }),
            }),
          ),
          Story.model(model => {
            expect(visibleIssueIds(model)).toEqual(
              visibleIssueIds(initialModel),
            )
            expect(visibleIssueOf(model, issue.id)).toEqual(latestIssue)
            expect(model.issueMoveState).toEqual(
              Issue.MoveState.Failed({
                issueId: issue.id,
                status: 'Done',
                insertionIndex: 0,
                error: 'The issue changed before it could be moved.',
              }),
            )
          }),
          Story.Command.expectNone(),
        )
      })
    },
  )
})

describe('when refreshing the workspace with an unsaved issue draft', () => {
  it.effect(
    'keeps the canonical issue and editable draft after a failed refresh',
    () => {
      const title = 'Keep this draft while refreshing'

      const error = 'The workspace is temporarily unavailable.'
      return Story.story(
        application,
        Story.init(url(issueRouter({ issueId: issueA.id }))),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: title }),
        ),
        Story.message(Message.ClickedRetryLoad()),
        Story.Command.expectExact(LoadWorkspace()),
        Story.model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Refreshing')
          expect(visibleWorkspaceOf(model).issues).toContainEqual(issueA)

          expect(activeIssueDetailModel(model).draft.title).toBe(title)
        }),
        Story.Command.resolve(
          LoadWorkspace,
          Message.FailedLoadWorkspace({ error }),
        ),
        Story.model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Stale')
          expect(AsyncData.getError(model.workspaceAsyncData)).toEqual(
            Option.some(error),
          )
          expect(visibleWorkspaceOf(model).issues).toContainEqual(issueA)

          expect(activeIssueDetailModel(model).draft.title).toBe(title)
          expect(hasConflict(activeIssueDetailModel(model), issueA)).toBe(false)
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect(
    'publishes the refreshed issue and derives a conflict without replacing the draft',
    () => {
      const title = 'Keep this unsaved title'

      const latestIssue = modifyFields(issueA, {
        title: () => 'A newer title loaded from the repository',
        version: version => version + 1,
      })

      const latestWorkspace = modifyFields(initialWorkspace, {
        issues: Array.map(issue =>
          issue.id === latestIssue.id ? latestIssue : issue,
        ),
      })
      return Story.story(
        application,
        Story.init(url(issueRouter({ issueId: issueA.id }))),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Story.messageIn(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: title }),
        ),
        Story.message(Message.ClickedRetryLoad()),
        Story.Command.expectExact(LoadWorkspace()),
        Story.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: latestWorkspace }),
        ),
        Story.model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Success')
          expect(visibleWorkspaceOf(model).issues).toContainEqual(latestIssue)

          expect(activeIssueDetailModel(model).draft.title).toBe(title)
          expect(hasConflict(activeIssueDetailModel(model), latestIssue)).toBe(
            true,
          )
        }),
        Story.Command.expectNone(),
      )
    },
  )
})
