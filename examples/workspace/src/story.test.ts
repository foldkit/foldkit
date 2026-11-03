import { Array, Effect, Number, Option, Record } from 'effect'
import { AsyncData, type Block } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import {
  Command,
  type TestBlock,
  given,
  init,
  message,
  messageFrom,
  model,
  story,
  withBlock,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessageFor } from 'foldkit/test'
import * as Url from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import {
  DragAndDropBlock,
  test as DragAndDropTest,
} from '@foldkit/ui/dragAndDrop'

import { ApplicationBlock, layer } from './block'
import { DragAndDropBinding } from './blocks/issueBoard/composition'
import { containerId, draggableId } from './blocks/issueBoard/dragAndDrop'
import { IssueDetailBlock } from './blocks/issueDetail'
import { CommentComposerBlock } from './blocks/issueDetail/blocks/commentComposer'
import { AddComment } from './blocks/issueDetail/blocks/commentComposer/command'
import { PostState } from './blocks/issueDetail/blocks/commentComposer/model'
import { SaveIssue } from './blocks/issueDetail/command'
import { CommentComposerBinding } from './blocks/issueDetail/composition'
import { Message as IssueDetailMessage } from './blocks/issueDetail/message'
import { SaveState } from './blocks/issueDetail/model'
import { IssueListBlock } from './blocks/issueList'
import { NotificationCenterBlock } from './blocks/notificationCenter'
import { ProjectSettingsBlock } from './blocks/projectSettings'
import { SaveProject } from './blocks/projectSettings/command'
import { SaveState as ProjectSaveState } from './blocks/projectSettings/model'
import {
  AppendActivity,
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
import {
  Comment,
  type Issue,
  IssueDraft,
  IssueFilters,
  type IssueStatus,
  SavedView,
  draftFromIssue,
  initialWorkspace,
  mergeIssue,
  revisionFromIssue,
  savedIssueFromIssue,
} from './domain'
import { WorkspaceListboxBlock } from './listbox'
import { Message } from './message'
import { type Model } from './model'
import { IssueMoveState } from './optimistic'
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
  appliedIssueFilters,
  maybeActiveIssueBoard,
  maybeActiveIssueDetail,
  unsavedIssueDrafts,
  visibleWorkspaceAsyncData,
} from './selection'

type IssueDetailBlockMessage = Block.ExecutableOf<
  typeof IssueDetailBlock
>['Message']['Type']

type CommentComposerMessage = typeof CommentComposerBlock.Message.Type
type DragAndDropMessage = typeof DragAndDropBlock.Message.Type

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issueB = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))
const issueC = Option.getOrThrow(Array.get(initialWorkspace.issues, 2))

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const loadedModel = (
  executable: TestBlock<typeof ApplicationBlock>,
  path = '/',
) => {
  const init = executable.init
  const update = executable.update

  const applicationInit = init(url(path))

  const workspaceLoad = update(
    applicationInit.model,
    Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
  )

  return workspaceLoad.model
}

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
      return story(
        ApplicationBlock,
        init(url('/')),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(
          Message.ClickedLink({
            request: UrlRequest.Internal({ url: url(projectPath) }),
          }),
        ),
        Command.expectExact(
          NavigateInternal({ url: Url.toString(url(projectPath)) }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(Message.ChangedUrl({ url: url(projectPath) })),
        message(
          Message.ChangedUrl({
            url: url(routeToPath(withIssueId(projectRoute, issueB.id))),
          }),
        ),
        model(model => {
          expect(model.route).toEqual(
            ApplicationRoute.Project({
              projectId: issueB.projectId,
              issueId: issueB.id,
            }),
          )
          expect(activeIssueDetailModel(model).issueId).toBe(issueB.id)
        }),
        messageFrom(
          IssueDetailsBinding,
          issueB.id,
          IssueDetailBlock.Message.ClickedClose(),
        ),
        Command.expectExact(NavigateInternal({ url: projectPath })),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(Message.ChangedUrl({ url: url(projectPath) })),
        model(model => {
          expect(model.route).toEqual(
            ApplicationRoute.Project({ projectId: issueB.projectId }),
          )
          expect(Record.values(model.issueDetails)).toHaveLength(1)
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect('retains the editor when leaving the issue route', () => {
    return story(
      ApplicationBlock,
      init(url(issueRouter({ issueId: issueA.id }))),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      message(Message.ChangedUrl({ url: url('/') })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Issues({}))
        expect(Record.values(model.issueDetails)).toHaveLength(1)
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(layer))
  })

  it.effect(
    'reuses each retained editor when navigating between issues',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedModel(
          executable,
          issueRouter({ issueId: issueA.id }),
        )

        const issueAEditor = activeIssueDetailModel(initialModel)

        const issueBPath = issueRouter({ issueId: issueB.id })
        return story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ChangedUrl({ url: url(issueBPath) })),
          model(model => {
            expect(activeIssueDetailModel(model).issueId).toBe(issueB.id)
            expect(Record.values(model.issueDetails)).toHaveLength(2)
          }),
          message(
            Message.ChangedUrl({
              url: url(issueRouter({ issueId: issueA.id })),
            }),
          ),
          model(model => {
            expect(activeIssueDetailModel(model)).toBe(issueAEditor)
            expect(Record.values(model.issueDetails)).toHaveLength(2)
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect('settles a save while another issue is open', () => {
    const savedIssueSnapshot = modifyFields(issueA, {
      title: () => 'Saved while another issue is open',
      version: Number.increment,
    })
    return story(
      ApplicationBlock,
      init(url(issueRouter({ issueId: issueA.id }))),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      messageFrom(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailBlock.Message.UpdatedTitle({
          value: savedIssueSnapshot.title,
        }),
      ),
      messageFrom(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailBlock.Message.SubmittedIssueForm(),
      ),
      message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueB.id })),
        }),
      ),
      model(model =>
        expect(activeIssueDetailModel(model).issueId).toBe(issueB.id),
      ),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          expectedVersion: issueA.version,
        }),
      ),
      model(model => {
        const hiddenEditor = retainedIssueDetailModel(model, issueA.id)

        expect(activeIssueDetailModel(model).issueId).toBe(issueB.id)
        expect(hiddenEditor.saveState).toEqual(SaveState.Idle())
        expect(hiddenEditor.baseline).toEqual(
          revisionFromIssue(savedIssueSnapshot),
        )
        expect(visibleWorkspaceOf(model).issues).toContainEqual(
          savedIssueSnapshot,
        )
        expect(unsavedIssueDrafts(model)).toEqual([])
        expect(model.maybeNotice).toEqual(
          Option.some(`${savedIssueSnapshot.identifier} saved`),
        )
      }),
      Command.expectNone(),
      messageFrom(
        IssueDetailsBinding,
        issueB.id,
        IssueDetailBlock.Message.ClickedClose(),
      ),
      Command.expectExact(NavigateInternal({ url: '/' })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    ).pipe(Effect.provide(layer))
  })

  it.effect('closes a direct issue URL to All issues', () => {
    return story(
      ApplicationBlock,
      init(url(issueRouter({ issueId: issueA.id }))),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      messageFrom(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailBlock.Message.ClickedClose(),
      ),
      Command.expectExact(NavigateInternal({ url: '/' })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    ).pipe(Effect.provide(layer))
  })

  it.effect(
    'reconciles every retained editor from a refreshed workspace',
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
      return story(
        ApplicationBlock,
        init(url(issueRouter({ issueId: issueA.id }))),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueB.id })),
          }),
        ),
        messageFrom(
          IssueDetailsBinding,
          issueB.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: localTitle }),
        ),
        message(
          Message.ChangedUrl({
            url: url(issueRouter({ issueId: issueC.id })),
          }),
        ),
        message(Message.ChangedUrl({ url: url('/people') })),
        message(
          Message.SucceededLoadWorkspace({ workspace: refreshedWorkspace }),
        ),
        model(model => {
          const retainedIssueA = retainedIssueDetailModel(model, issueA.id)
          const retainedIssueB = retainedIssueDetailModel(model, issueB.id)
          const retainedIssueC = retainedIssueDetailModel(model, issueC.id)

          expect(maybeActiveIssueDetail(model)).toEqual(Option.none())
          expect(retainedIssueA.baseline).toEqual(
            revisionFromIssue(latestIssueA),
          )
          expect(retainedIssueA.draft).toEqual(draftFromIssue(latestIssueA))
          expect(retainedIssueB.draft.title).toBe(localTitle)
          expect(retainedIssueB.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(latestIssueB)),
          )
          expect(retainedIssueC.baseline).toEqual(revisionFromIssue(issueC))
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )
})

const unrelatedIssue = Option.getOrThrow(
  Array.findFirst(initialWorkspace.issues, issue => issue.id === 'issue-104'),
)

const visibleWorkspaceOf = (model: Model) =>
  Option.getOrThrow(AsyncData.getData(visibleWorkspaceAsyncData(model)))

const visibleNotifications = (model: Model) =>
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

      const comment = Comment.make({
        id: 'activity-comment',
        authorId: 'alex',
        body,
        createdAt: '2026-10-24T12:00:00.000Z',
      })

      const commentedIssue = modifyFields(issueA, {
        comments: Array.append(comment),
      })

      const staleComment = Comment.make({
        id: 'stale-comment',
        authorId: 'jordan',
        body: 'This older event arrived late.',
        createdAt: '2026-10-23T12:00:00.000Z',
      })

      const staleIssue = modifyFields(issueA, {
        comments: Array.append(staleComment),
      })

      const notificationId = `comment:${comment.id}:maya`
      return story(
        ApplicationBlock,
        init(url('/')),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(Message.ClickedSimulateActivity()),
        Command.expectExact(
          AppendActivity({ issueId: issueA.id, authorId: 'alex', body }),
        ),
        Command.resolve(
          AppendActivity,
          Message.SucceededAppendActivity({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        model(model => {
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({
              id: notificationId,
              issueId: issueA.id,
              recipientId: 'maya',
              isRead: false,
            }),
          ])
        }),
        messageFrom(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedNotificationReadState({
            notificationId,
          }),
        ),
        message(
          Message.SucceededAppendActivity({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        message(
          Message.SucceededAppendActivity({
            issueId: staleIssue.id,
            comment: Option.getOrThrow(Array.last(staleIssue.comments)),
          }),
        ),
        model(model => {
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({
              id: `comment:${staleComment.id}:maya`,
              isRead: false,
            }),
            expect.objectContaining({ id: notificationId, isRead: true }),
          ])

          const visibleIssue = Option.getOrThrow(
            Array.findFirst(
              visibleWorkspaceOf(model).issues,
              issue => issue.id === issueA.id,
            ),
          )

          expect(visibleIssue).toEqual(mergeIssue(commentedIssue, staleIssue))
          expect(visibleIssue.comments).toContainEqual(staleComment)
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'keeps background activity relevant and clears a failed event after assignment succeeds',
    () => {
      const assignedIssue = modifyFields(issueB, {
        version: version => version + 1,
        maybeAssigneeId: () => Option.some('maya'),
      })
      return story(
        ApplicationBlock,
        init(url(issueRouter({ issueId: issueB.id }))),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(Message.TickedActivityStream()),
        Command.expectExact(
          AppendActivity({
            issueId: issueA.id,
            authorId: 'alex',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Command.resolve(
          AppendActivity,
          Message.FailedAppendActivity({ error: 'Activity is unavailable.' }),
        ),
        message(Message.TickedActivityStream()),
        Command.resolve(
          AppendActivity,
          Message.FailedAppendActivity({
            error: 'Activity is still unavailable.',
          }),
        ),
        message(Message.TickedActivityStream()),
        Command.expectExact(
          AssignIssue({
            issueId: issueB.id,
            draft: modifyFields(IssueDraft.make(issueB), {
              maybeAssigneeId: () => Option.some('maya'),
            }),
            expectedVersion: issueB.version,
            actorId: 'alex',
          }),
        ),
        Command.resolve(
          AssignIssue,
          Message.SucceededAssignIssue({
            savedIssue: savedIssueFromIssue(assignedIssue),
            actorId: 'alex',
            createdAt: '2026-10-24T12:00:00.000Z',
          }),
        ),
        model(model => {
          expect(model.maybeNotice).toEqual(Option.none())
          expect(visibleNotifications(model)).toContainEqual(
            expect.objectContaining({
              issueId: issueB.id,
              recipientId: 'maya',
              kind: { _tag: 'Assigned' },
            }),
          )
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'keeps own and unrelated comments outside the active member view',
    () => {
      const ownComment = Comment.make({
        id: 'own-comment',
        authorId: 'maya',
        body: 'I added more context for the team.',
        createdAt: '2026-10-24T13:00:00.000Z',
      })

      const unrelatedComment = Comment.make({
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
      return story(
        ApplicationBlock,
        init(url('/')),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(
          Message.SucceededAppendActivity({
            issueId: ownCommentIssue.id,
            comment: Option.getOrThrow(Array.last(ownCommentIssue.comments)),
          }),
        ),
        message(
          Message.SucceededAppendActivity({
            issueId: unrelatedCommentIssue.id,
            comment: Option.getOrThrow(
              Array.last(unrelatedCommentIssue.comments),
            ),
          }),
        ),
        model(model => {
          expect(visibleNotifications(model)).toEqual([])
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
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'isolates read state by member and routes a selected notification',
    () => {
      const comment = Comment.make({
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
      return story(
        ApplicationBlock,
        init(url('/')),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(
          Message.SucceededAppendActivity({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        message(
          Message.SucceededAssignIssue({
            savedIssue: savedIssueFromIssue(assignedIssue),
            actorId: 'jordan',
            createdAt: '2026-10-24T15:05:00.000Z',
          }),
        ),
        messageFrom(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedMarkAllAsRead({
            recipientId: 'maya',
          }),
        ),
        model((model: Model) => {
          expect(
            Array.every(
              visibleNotifications(model),
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
        messageFrom(
          ActiveMemberListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({ item: 'alex' }),
        ),
        model(model => {
          expect(model.activeMemberId).toBe('alex')
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({
              id: alexNotificationId,
              isRead: false,
            }),
          ])
        }),
        messageFrom(
          NotificationCenterBinding,
          NotificationCenterBlock.Message.ClickedNotification({
            notificationId: alexNotificationId,
          }),
        ),
        Command.expectExact(
          NavigateInternal({ url: issuesRouter({ issueId: issueA.id }) }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        model(model => {
          expect(visibleNotifications(model)).toEqual([
            expect.objectContaining({
              id: alexNotificationId,
              isRead: true,
            }),
          ])
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'preserves a foreground notice when background activity succeeds',
    () => {
      return withBlock(ApplicationBlock, executable => {
        return story(
          ApplicationBlock,
          given(
            modifyFields(loadedModel(executable), {
              maybeNotice: () => Option.some('Saved view “My work”'),
            }),
          ),
          message(
            Message.SucceededAppendActivity({
              issueId: issueA.id,
              comment: Comment.make({
                id: 'notice-comment',
                authorId: 'alex',
                body: 'Activity',
                createdAt: '2026-10-24T12:00:00.000Z',
              }),
            }),
          ),
          model(model => {
            expect(model.maybeNotice).toEqual(
              Option.some('Saved view “My work”'),
            )
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
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
      return story(
        ApplicationBlock,
        init(url(projectSettingsPath)),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        messageFrom(
          ProjectSettingsBinding,
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished project name',
          }),
        ),
        message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
        model(model => {
          expect(projectSettingsModel(model, project.id).draft.name).toBe(
            'Unfinished project name',
          )
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'keeps separate drafts across project switches and workspace refreshes',
    () => {
      return story(
        ApplicationBlock,
        init(url(projectSettingsPath)),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        messageFrom(
          ProjectSettingsBinding,
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished platform work',
          }),
        ),
        message(
          Message.ChangedUrl({
            url: url(`/projects/${anotherProject.id}/settings`),
          }),
        ),
        model(model => {
          expect(
            projectSettingsModel(model, anotherProject.id).draft.name,
          ).toBe(anotherProject.name)
        }),
        message(
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
        model(model => {
          expect(projectSettingsModel(model, project.id).draft.name).toBe(
            'Unfinished platform work',
          )
          expect(Record.values(model.projectSettings)).toHaveLength(2)
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'saves project settings while an unrelated issue move is pending',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const savedProject = modifyFields(project, { name: () => 'New name' })

        const initialModel = modifyFields(
          loadedModel(executable, projectSettingsPath),
          {
            issueMoveState: () =>
              IssueMoveState.MovingIssue({
                issueId: issueA.id,
                status: 'Done',
                insertionIndex: 0,
                expectedVersion: issueA.version,
              }),
          },
        )
        return story(
          ApplicationBlock,
          given(initialModel),
          messageFrom(
            ProjectSettingsBinding,
            project.id,
            ProjectSettingsBlock.Message.UpdatedProjectName({
              value: savedProject.name,
            }),
          ),
          messageFrom(
            ProjectSettingsBinding,
            project.id,
            ProjectSettingsBlock.Message.SubmittedProjectSettings(),
          ),
          Command.expectExact(SaveProject({ project: savedProject })),
          Command.resolve(
            SaveProject,
            ProjectSettingsBlock.Message.SucceededSaveProject({
              project: savedProject,
            }),
          ),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'settles a project save after navigating away without touching another editor',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const savedProject = modifyFields(project, {
          name: () => 'Saved while away',
        })

        const initialModel = modifyFields(
          loadedModel(executable, projectSettingsPath),
          {
            issueMoveState: () =>
              IssueMoveState.MovingIssue({
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
        return story(
          ApplicationBlock,
          given(initialModel),
          message(
            Message.ChangedUrl({
              url: url(`/projects/${anotherProject.id}/settings`),
            }),
          ),
          messageFrom(
            ProjectSettingsBinding,
            project.id,
            ProjectSettingsBlock.Message.SucceededSaveProject({
              project: savedProject,
            }),
          ),
          model(model => {
            expect(projectSettingsModel(model, project.id).baseline).toEqual(
              savedProject,
            )
            expect(
              projectSettingsModel(model, anotherProject.id).draft.name,
            ).toBe(anotherProject.name)
            expect(model.route).toEqual(
              ApplicationRoute.ProjectSettings({
                projectId: anotherProject.id,
              }),
            )
          }),
          message(
            Message.SucceededMoveIssue({
              movedIssue: {
                issueId: issueA.id,
                status: 'Done',
                insertionIndex: 0,
                version: issueA.version + 1,
              },
            }),
          ),
          model(model => {
            expect(visibleWorkspaceOf(model).projects).toContainEqual(
              savedProject,
            )
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect('publishes only the project returned by a completed save', () => {
    const savedProject = modifyFields(project, {
      name: () => 'Platform engineering',
    })
    return story(
      ApplicationBlock,
      init(url(projectSettingsPath)),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      messageFrom(
        ProjectSettingsBinding,
        project.id,
        ProjectSettingsBlock.Message.UpdatedProjectName({
          value: savedProject.name,
        }),
      ),
      messageFrom(
        ProjectSettingsBinding,
        project.id,
        ProjectSettingsBlock.Message.SubmittedProjectSettings(),
      ),
      Command.expectExact(SaveProject({ project: savedProject })),
      Command.resolve(
        SaveProject,
        ProjectSettingsBlock.Message.SucceededSaveProject({
          project: savedProject,
        }),
      ),
      model(model => {
        expect(visibleWorkspaceOf(model).projects).toContainEqual(savedProject)
        expect(visibleWorkspaceOf(model).issues).toEqual(
          initialWorkspace.issues,
        )
      }),
    ).pipe(Effect.provide(layer))
  })

  it.effect('does not initialize settings for an unknown project', () => {
    return story(
      ApplicationBlock,
      init(url('/projects/missing/settings')),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      model(model => {
        expect(model.projectSettings).toEqual({})
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(layer))
  })
})

describe('Application child policies', () => {
  it.effect('retains one Board instance per project across navigation', () => {
    return withBlock(ApplicationBlock, executable =>
      Effect.gen(function* () {
        const initialModel = loadedModel(executable, '/projects/platform/board')
        const issueBoard = activeIssueBoardModel(initialModel)
        const issue = Option.getOrThrow(
          Array.findFirst(
            initialWorkspace.issues,
            issue => issue.projectId === 'platform',
          ),
        )

        yield* story(
          ApplicationBlock,
          given(initialModel),
          message(
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
          model(model => {
            expect(activeIssueBoardModel(model)).toBe(issueBoard)
          }),
          message(Message.ChangedUrl({ url: url('/projects/platform/board') })),
          model(model => {
            expect(activeIssueBoardModel(model)).toBe(issueBoard)
          }),
          message(
            Message.ChangedUrl({ url: url('/projects/experience/board') }),
          ),
          model(model => {
            const activeIssueBoard = activeIssueBoardModel(model)

            expect(Record.get(model.issueBoards, 'experience')).toEqual(
              Option.some(activeIssueBoard),
            )
            expect(activeIssueBoard).not.toBe(issueBoard)
          }),
          message(Message.ChangedUrl({ url: url('/people') })),
          model(model => {
            expect(maybeActiveIssueBoard(model)).toEqual(Option.none())
            expect(Record.values(model.issueBoards)).toHaveLength(2)
          }),
          Command.expectNone(),
        )

        yield* story(
          ApplicationBlock,
          init(url('/projects/missing/board')),
          Command.resolve(
            LoadWorkspace,
            Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
          ),
          model(model => {
            expect(model.issueBoards).toEqual({})
          }),
          Command.expectNone(),
        )
      }),
    ).pipe(Effect.provide(layer))
  })

  it.effect(
    'retains a failed move for retry and uses the refreshed revision',
    () => {
      const issue = Option.getOrThrow(
        Array.findFirst(
          initialWorkspace.issues,
          issue => issue.projectId === 'platform',
        ),
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
      return story(
        ApplicationBlock,
        init(url('/projects/platform/board')),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(conflict),
        model(model => {
          expect(visibleWorkspaceOf(model).issues).toContainEqual(latestIssue)
          expect(model.issueMoveState).toEqual(
            IssueMoveState.FailedMove({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: 'Reloaded the latest revision.',
            }),
          )
        }),
        message(Message.ClickedRetryMove()),
        Command.expectExact(
          MoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            expectedVersion: latestIssue.version,
          }),
        ),
        Command.resolve(
          MoveIssue,
          Message.FailedMoveIssue({
            issueId: issue.id,
            status: 'Done',
            insertionIndex: 0,
            error: RepositoryError.Unavailable({
              operation: 'Move',
              message: 'The retry is still unavailable.',
            }),
          }),
        ),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'routes Issue List facts through filter Commands and saves the applied filters',
    () => {
      const queriedFilters = IssueFilters.make({
        ...defaultIssueFilters,
        query: 'keyboard',
      })

      const savedFilters = IssueFilters.make({
        ...queriedFilters,
        groupBy: 'Project',
      })

      const clearedFilters = IssueFilters.make({
        ...savedFilters,
        query: '',
      })
      return story(
        ApplicationBlock,
        init(url('/')),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        messageFrom(
          IssueListBinding,
          IssueListBlock.Message.UpdatedQuery({ value: 'keyboard' }),
        ),
        Command.expectExact(
          ReplaceInternalUrl({
            url: issuesRouter({ filters: queriedFilters }),
          }),
        ),
        Command.resolve(
          ReplaceInternalUrl,
          Message.CompletedReplaceInternalUrl(),
        ),
        message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: queriedFilters })),
          }),
        ),
        messageFrom(
          IssueListBinding,
          IssueListBlock.Message.UpdatedGrouping({ value: 'Project' }),
        ),
        Command.expectExact(
          NavigateInternal({
            url: issuesRouter({ filters: savedFilters }),
          }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: savedFilters })),
          }),
        ),
        messageFrom(
          IssueListBinding,
          IssueListBlock.Message.UpdatedSavedViewName({
            value: 'Keyboard work',
          }),
        ),
        messageFrom(
          IssueListBinding,
          IssueListBlock.Message.SubmittedSavedView({
            filters: savedFilters,
          }),
        ),
        model(model => {
          expect(model.savedViews).toEqual([
            SavedView.make({
              id: 'view-1',
              name: 'Keyboard work',
              filters: savedFilters,
            }),
          ])
          expect(model.nextSavedViewId).toBe(2)
        }),
        messageFrom(
          IssueListBinding,
          IssueListBlock.Message.ClickedClearFilters(),
        ),
        Command.expectExact(
          NavigateInternal({
            url: issuesRouter({ filters: clearedFilters }),
          }),
        ),
        Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
        message(
          Message.ChangedUrl({
            url: url(issuesRouter({ filters: clearedFilters })),
          }),
        ),
        model(model => {
          expect(appliedIssueFilters(model)).toEqual(clearedFilters)
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'restores saved filters and preserves explicit URL overrides',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const savedFilters = IssueFilters.make({
          ...defaultIssueFilters,
          query: 'keyboard',
          groupBy: 'Project',
        })

        const savedView = SavedView.make({
          id: 'view-1',
          name: 'Keyboard work',
          filters: savedFilters,
        })

        const initialModel = modifyFields(loadedModel(executable), {
          savedViews: () => [savedView],
          nextSavedViewId: () => 2,
        })
        return story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ChangedUrl({ url: url('/views/view-1') })),
          model(model => {
            expect(appliedIssueFilters(model)).toEqual(savedFilters)
          }),
          message(
            Message.ChangedUrl({ url: url('/views/view-1?search=override') }),
          ),
          model(model => {
            expect(appliedIssueFilters(model)).toEqual(
              IssueFilters.make({
                ...defaultIssueFilters,
                query: 'override',
              }),
            )
          }),
          message(Message.ChangedUrl({ url: url('/views/view-1?filters=1') })),
          model(model => {
            expect(appliedIssueFilters(model)).toEqual(defaultIssueFilters)
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'deletes unrelated and displayed saved views without changing filters',
    () => {
      return withBlock(ApplicationBlock, executable =>
        Effect.gen(function* () {
          const savedFilters = IssueFilters.make({
            ...defaultIssueFilters,
            query: 'keyboard',
            groupBy: 'Project',
          })
          const displayedView = SavedView.make({
            id: 'view-1',
            name: 'Keyboard work',
            filters: savedFilters,
          })
          const unrelatedView = SavedView.make({
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
            loadedModel(executable, displayedPath),
            {
              savedViews: () => [displayedView, unrelatedView],
              nextSavedViewId: () => 3,
            },
          )

          yield* story(
            ApplicationBlock,
            given(initialModel),
            message(
              Message.ClickedDeleteSavedView({ viewId: unrelatedView.id }),
            ),
            model(model => {
              expect(model.savedViews).toEqual([displayedView])
              expect(model.route).toEqual(
                ApplicationRoute.SavedView({
                  viewId: displayedView.id,
                  filters: savedFilters,
                }),
              )
              expect(appliedIssueFilters(model)).toEqual(savedFilters)
            }),
            Command.expectNone(),
          )

          yield* story(
            ApplicationBlock,
            given(initialModel),
            message(
              Message.ClickedDeleteSavedView({ viewId: displayedView.id }),
            ),
            model(model => {
              expect(model.savedViews).toEqual([unrelatedView])
              expect(appliedIssueFilters(model)).toEqual(savedFilters)
            }),
            Command.expectExact(NavigateInternal({ url: issuesPath })),
            Command.resolve(
              NavigateInternal,
              Message.CompletedNavigateInternal(),
            ),
          )
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'deleting a saved view behind an issue preserves its filters for close',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const savedFilters = IssueFilters.make({
          ...defaultIssueFilters,
          query: 'keyboard',
          groupBy: 'Project',
        })

        const changedFilters = IssueFilters.make({
          ...savedFilters,
          query: 'unsaved filters',
        })

        const savedView = SavedView.make({
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

        const initialModel = modifyFields(loadedModel(executable, issuePath), {
          savedViews: () => [savedView],
          nextSavedViewId: () => 2,
        })
        return story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ClickedDeleteSavedView({ viewId: savedView.id })),
          Command.expectExact(ReplaceInternalUrl({ url: repairedIssuePath })),
          model(model => {
            expect(model.savedViews).toEqual([])

            expect(model.route).toEqual(
              ApplicationRoute.Issues({
                filters: changedFilters,
                issueId: 'issue-102',
              }),
            )
            expect(appliedIssueFilters(model)).toEqual(changedFilters)
          }),
          Command.resolve(
            ReplaceInternalUrl,
            Message.CompletedReplaceInternalUrl(),
          ),
          message(Message.ChangedUrl({ url: url(repairedIssuePath) })),
          messageFrom(
            IssueDetailsBinding,
            activeIssueDetailModel(initialModel).issueId,
            IssueDetailBlock.Message.ClickedClose(),
          ),
          Command.expectExact(NavigateInternal({ url: issuesPath })),
          Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect('requests teammate activity from the always-on stream fact', () => {
    return story(
      ApplicationBlock,
      init(url('/')),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      message(Message.TickedActivityStream()),
      model(model => {
        expect(model.activityTick).toBe(1)
      }),
      Command.expectExact(
        AppendActivity({
          issueId: 'issue-101',
          authorId: 'alex',
          body: 'I checked the latest changes. This is ready for another look.',
        }),
      ),
      Command.resolve(
        AppendActivity,
        Message.FailedAppendActivity({ error: 'Activity is unavailable.' }),
      ),
    ).pipe(Effect.provide(layer))
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

  const loadedModel = (
    executable: TestBlock<typeof ApplicationBlock>,
    issueId = issueA.id,
  ) =>
    executable.update(
      executable.init(url(issuePath(issueId))).model,
      Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
    ).model

  const activeIssueDetailModel = (model: Model) =>
    Option.getOrThrow(maybeActiveIssueDetail(model))

  const issueDetailMessage = (
    executable: TestBlock<typeof ApplicationBlock>,
    model: Model,
    childMessage: IssueDetailBlockMessage,
  ) => {
    const issueDetail = activeIssueDetailModel(model)

    return toParentMessageFor(executable)(
      IssueDetailsBinding,
      issueDetail.issueId,
      childMessage,
    )
  }

  const commentComposerMessage = (
    executable: TestBlock<typeof ApplicationBlock>,
    model: Model,
    childMessage: CommentComposerMessage,
  ) => {
    const commentComposerDelivery = toParentMessageFor(
      executable,
      IssueDetailsBinding,
    )(CommentComposerBinding, childMessage)

    return issueDetailMessage(executable, model, commentComposerDelivery)
  }

  const retainedIssueDetailModel = (model: Model, issueId = issueA.id) =>
    Option.getOrThrow(Record.get(model.issueDetails, issueId))

  const visibleIssue = (model: Model, issueId = issueA.id) =>
    Option.getOrThrow(
      Option.flatMap(
        AsyncData.getData(visibleWorkspaceAsyncData(model)),
        workspace =>
          Array.findFirst(workspace.issues, issue => issue.id === issueId),
      ),
    )

  const updatedComment = (
    executable: TestBlock<typeof ApplicationBlock>,
    model: Model,
    value = commentBody,
  ) => {
    return commentComposerMessage(
      executable,
      model,
      CommentComposerBlock.Message.UpdatedBody({ value }),
    )
  }

  it.effect(
    'retains field edits and clears the draft indicator when clean',
    () => {
      return story(
        ApplicationBlock,
        init(url(issuePath(issueA.id))),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        messageFrom(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
        ),
        model(model => {
          expect(retainedIssueDetailModel(model)).toMatchObject({
            issueId: issueA.id,
            baseline: revisionFromIssue(issueA),
            draft: modifyFields(draftFromIssue(issueA), {
              title: () => editedTitle,
            }),
            commentComposer: { body: '' },
          })
          expect(unsavedIssueDrafts(model)).toEqual([
            { issueId: issueA.id, title: editedTitle },
          ])
        }),
        messageFrom(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailMessage.UpdatedTitle({ value: issueA.title }),
        ),
        model(model => expect(unsavedIssueDrafts(model)).toEqual([])),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect('retains a comment by itself and alongside field edits', () => {
    return withBlock(ApplicationBlock, executable => {
      const initialModel = loadedModel(executable)
      return story(
        executable.update,
        given(initialModel),
        message(updatedComment(executable, initialModel)),
        model(model => {
          expect(retainedIssueDetailModel(model)).toMatchObject({
            issueId: issueA.id,
            baseline: revisionFromIssue(issueA),
            draft: draftFromIssue(issueA),
            commentComposer: { body: commentBody },
          })
          expect(unsavedIssueDrafts(model)).toEqual([
            { issueId: issueA.id, title: issueA.title },
          ])
        }),
        message(
          toParentMessageFor(executable)(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
        ),
        model(model => {
          expect(retainedIssueDetailModel(model).draft.title).toBe(editedTitle)
          expect(retainedIssueDetailModel(model).commentComposer.body).toBe(
            commentBody,
          )
        }),
        message(updatedComment(executable, initialModel, '')),
        model(model =>
          expect(retainedIssueDetailModel(model).draft.title).toBe(editedTitle),
        ),
        message(
          toParentMessageFor(executable)(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: issueA.title }),
          ),
        ),
        model(model => expect(unsavedIssueDrafts(model)).toEqual([])),
      )
    }).pipe(Effect.provide(layer))
  })

  it.effect(
    'preserves an unsent comment after saving fields and clears a clean draft indicator',
    () => {
      return withBlock(ApplicationBlock, executable =>
        Effect.gen(function* () {
          const initialModel = loadedModel(executable)
          const savedIssueSnapshot = modifyFields(issueA, {
            title: () => editedTitle,
            version: version => version + 1,
          })

          story(
            executable.update,
            given(initialModel),
            message(updatedComment(executable, initialModel)),
            message(
              toParentMessageFor(executable)(
                IssueDetailsBinding,
                issueA.id,
                IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
              ),
            ),
            message(
              issueDetailMessage(
                executable,
                initialModel,
                IssueDetailMessage.SubmittedIssueForm(),
              ),
            ),
            Command.resolve(
              SaveIssue,
              IssueDetailMessage.SucceededSaveIssue({
                savedIssue: savedIssueFromIssue(savedIssueSnapshot),
                expectedVersion: issueA.version,
              }),
            ),
            model(model => {
              expect(retainedIssueDetailModel(model)).toMatchObject({
                issueId: savedIssueSnapshot.id,
                baseline: revisionFromIssue(savedIssueSnapshot),
                draft: draftFromIssue(savedIssueSnapshot),
                commentComposer: { body: commentBody },
              })
            }),
            Command.expectNone(),
          )

          story(
            executable.update,
            given(initialModel),
            message(
              toParentMessageFor(executable)(
                IssueDetailsBinding,
                issueA.id,
                IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
              ),
            ),
            message(
              issueDetailMessage(
                executable,
                initialModel,
                IssueDetailMessage.SubmittedIssueForm(),
              ),
            ),
            Command.resolve(
              SaveIssue,
              IssueDetailMessage.SucceededSaveIssue({
                savedIssue: savedIssueFromIssue(savedIssueSnapshot),
                expectedVersion: issueA.version,
              }),
            ),
            model(model => expect(unsavedIssueDrafts(model)).toEqual([])),
            Command.expectNone(),
          )
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect('rebases retained field edits after a comment succeeds', () => {
    return withBlock(ApplicationBlock, executable => {
      const initialModel = loadedModel(executable)

      const savedComment = Comment.make({
        id: 'comment-retained-draft',
        authorId: initialModel.activeMemberId,
        body: commentBody,
        createdAt: '2026-10-23T12:00:00.000Z',
      })

      const issueWithComment = modifyFields(issueA, {
        comments: Array.append(savedComment),
      })
      return story(
        executable.update,
        given(initialModel),
        message(
          toParentMessageFor(executable)(
            IssueDetailsBinding,
            issueA.id,
            IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
          ),
        ),
        message(updatedComment(executable, initialModel)),
        message(
          commentComposerMessage(
            executable,
            initialModel,
            CommentComposerBlock.Message.SubmittedCommentForm({
              authorId: initialModel.activeMemberId,
            }),
          ),
        ),
        Command.resolve(
          AddComment,
          CommentComposerBlock.Message.SucceededAddComment({
            comment: Option.getOrThrow(Array.last(issueWithComment.comments)),
          }),
        ),
        model(model => {
          const issueDetail = activeIssueDetailModel(model)
          const retainedIssueDetail = retainedIssueDetailModel(model)

          expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
          expect(issueDetail.saveState._tag).toBe('Idle')
          expect(issueDetail.commentComposer.body).toBe('')

          expect(retainedIssueDetail.baseline).toEqual(
            revisionFromIssue(issueWithComment),
          )
          expect(retainedIssueDetail.draft.title).toBe(editedTitle)
          expect(retainedIssueDetail.commentComposer.body).toBe('')
        }),
        Command.expectNone(),
      )
    }).pipe(Effect.provide(layer))
  })

  it.effect(
    'keeps the newest issue when save and comment successes arrive out of order',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedModel(executable)

        const savedIssueSnapshot = modifyFields(issueA, {
          title: () => editedTitle,
          version: version => version + 1,
        })

        const savedComment = Comment.make({
          id: 'comment-after-save',
          authorId: initialModel.activeMemberId,
          body: commentBody,
          createdAt: '2026-10-23T12:02:00.000Z',
        })

        const commentedIssue = modifyFields(savedIssueSnapshot, {
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
        return story(
          executable.update,
          given(postingModel),
          message(
            commentComposerMessage(
              executable,
              postingModel,
              CommentComposerBlock.Message.SucceededAddComment({
                comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
              }),
            ),
          ),
          model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.saveState).toEqual({
              _tag: 'Saving',
              expectedVersion: issueA.version,
            })
            expect(issueDetail.baseline).toEqual(revisionFromIssue(issueA))
          }),
          message(
            issueDetailMessage(
              executable,
              postingModel,
              IssueDetailMessage.SucceededSaveIssue({
                savedIssue: savedIssueFromIssue(savedIssueSnapshot),
                expectedVersion: issueA.version,
              }),
            ),
          ),
          model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baseline).toEqual(
              revisionFromIssue(commentedIssue),
            )
            expect(issueDetail.draft).toEqual(draftFromIssue(commentedIssue))
            expect(issueDetail.saveState._tag).toBe('Idle')
            expect(issueDetail.commentComposer.body).toBe('')

            expect(visibleIssue(model)).toEqual(commentedIssue)
            expect(unsavedIssueDrafts(model)).toEqual([])
          }),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'merges out-of-order comments without losing newer activity',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedModel(executable)

        const activityComment = Comment.make({
          id: 'comment-newer-activity',
          authorId: 'jordan',
          body: 'This activity arrived after the pending comment was accepted.',
          createdAt: '2026-10-23T12:04:00.000Z',
        })

        const latestIssue = modifyFields(issueA, {
          comments: Array.append(activityComment),
        })

        const postedComment = Comment.make({
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
        return story(
          executable.update,
          given(postingModel),
          message(
            Message.SucceededAppendActivity({
              issueId: latestIssue.id,
              comment: Option.getOrThrow(Array.last(latestIssue.comments)),
            }),
          ),
          message(
            commentComposerMessage(
              executable,
              postingModel,
              CommentComposerBlock.Message.SucceededAddComment({
                comment: Option.getOrThrow(
                  Array.last(olderCommentIssue.comments),
                ),
              }),
            ),
          ),
          model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baseline).toEqual(revisionFromIssue(latestIssue))
            expect(issueDetail.draft).toEqual(draftFromIssue(latestIssue))
            expect(issueDetail.commentComposer.body).toBe('')

            expect(visibleIssue(model)).toEqual(
              mergeIssue(latestIssue, olderCommentIssue),
            )
            expect(unsavedIssueDrafts(model)).toEqual([])
          }),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'preserves an unsent comment when shared issue data changes',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedModel(executable)

        const activityComment = Comment.make({
          id: 'comment-observed-activity',
          authorId: 'jordan',
          body: 'An update from another teammate.',
          createdAt: '2026-10-23T12:05:00.000Z',
        })

        const observedIssue = modifyFields(issueA, {
          comments: Array.append(activityComment),
        })
        return story(
          executable.update,
          given(initialModel),
          message(updatedComment(executable, initialModel)),
          message(
            Message.SucceededAppendActivity({
              issueId: observedIssue.id,
              comment: Option.getOrThrow(Array.last(observedIssue.comments)),
            }),
          ),
          model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baseline).toEqual(
              revisionFromIssue(observedIssue),
            )
            expect(issueDetail.draft).toEqual(draftFromIssue(observedIssue))
            expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
            expect(issueDetail.commentComposer.body).toBe(commentBody)

            expect(retainedIssueDetailModel(model)).toMatchObject({
              issueId: observedIssue.id,
              baseline: revisionFromIssue(observedIssue),
              draft: draftFromIssue(observedIssue),
              commentComposer: { body: commentBody },
            })
          }),
          message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
          message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
          model(model => {
            const issueDetail = activeIssueDetailModel(model)

            expect(issueDetail.baseline).toEqual(
              revisionFromIssue(observedIssue),
            )
            expect(issueDetail.draft).toEqual(draftFromIssue(observedIssue))
            expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
            expect(issueDetail.commentComposer.body).toBe(commentBody)
          }),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect('rebases dirty fields over a newer comment-only revision', () => {
    const activityComment = Comment.make({
      id: 'comment-field-rebase',
      authorId: 'jordan',
      body: 'The editable issue fields did not change.',
      createdAt: '2026-10-23T12:06:00.000Z',
    })

    const observedIssue = modifyFields(issueA, {
      comments: Array.append(activityComment),
    })
    return story(
      ApplicationBlock,
      init(url(issuePath(issueA.id))),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      messageFrom(
        IssueDetailsBinding,
        issueA.id,
        IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
      ),
      message(
        Message.SucceededAppendActivity({
          issueId: observedIssue.id,
          comment: Option.getOrThrow(Array.last(observedIssue.comments)),
        }),
      ),
      model(model => {
        const issueDetail = activeIssueDetailModel(model)
        const retainedIssueDetail = retainedIssueDetailModel(model)

        expect(issueDetail.baseline).toEqual(revisionFromIssue(observedIssue))
        expect(issueDetail.draft.title).toBe(editedTitle)
        expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
        expect(issueDetail.saveState._tag).toBe('Idle')

        expect(retainedIssueDetail.baseline).toEqual(
          revisionFromIssue(observedIssue),
        )
        expect(retainedIssueDetail.draft.title).toBe(editedTitle)
      }),
    ).pipe(Effect.provide(layer))
  })

  it.effect(
    'reconciles retained state when reopening after compatible and conflicting changes',
    () => {
      return withBlock(ApplicationBlock, executable =>
        Effect.gen(function* () {
          const initialModel = loadedModel(executable)
          const activityComment = Comment.make({
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

          story(
            executable.update,
            given(initialModel),
            message(
              toParentMessageFor(executable)(
                IssueDetailsBinding,
                issueA.id,
                IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
              ),
            ),
            message(updatedComment(executable, initialModel)),
            message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
            message(
              Message.SucceededAppendActivity({
                issueId: commentedIssue.id,
                comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
              }),
            ),
            message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
            model(model => {
              const issueDetail = activeIssueDetailModel(model)

              expect(issueDetail.baseline).toEqual(
                revisionFromIssue(commentedIssue),
              )
              expect(issueDetail.draft.title).toBe(editedTitle)
              expect(issueDetail.commentComposer.body).toBe(commentBody)
              expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
              expect(issueDetail.saveState._tag).toBe('Idle')
            }),
          )

          story(
            executable.update,
            given(initialModel),
            message(updatedComment(executable, initialModel)),
            message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
            message(
              Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
            ),
            message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
            model(model => {
              const issueDetail = activeIssueDetailModel(model)

              expect(issueDetail.baseline).toEqual(
                revisionFromIssue(renamedIssue),
              )
              expect(issueDetail.draft).toEqual(draftFromIssue(renamedIssue))
              expect(issueDetail.commentComposer.body).toBe(commentBody)
              expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
              expect(issueDetail.saveState._tag).toBe('Idle')
            }),
          )

          story(
            executable.update,
            given(initialModel),
            message(
              toParentMessageFor(executable)(
                IssueDetailsBinding,
                issueA.id,
                IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
              ),
            ),
            message(updatedComment(executable, initialModel)),
            message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
            message(
              Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
            ),
            message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
            model(model => {
              const issueDetail = activeIssueDetailModel(model)

              expect(issueDetail.baseline).toEqual(revisionFromIssue(issueA))
              expect(issueDetail.draft.title).toBe(editedTitle)
              expect(issueDetail.commentComposer.body).toBe(commentBody)
              expect(issueDetail.maybeIncomingRevision).toEqual(
                Option.some(revisionFromIssue(renamedIssue)),
              )
              expect(issueDetail.saveState).toEqual(SaveState.Idle())
            }),
          )
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'discarding or reloading field edits preserves an unsent comment',
    () => {
      return withBlock(ApplicationBlock, executable =>
        Effect.gen(function* () {
          const initialModel = loadedModel(executable)
          const newerIssue = modifyFields(issueA, {
            title: () => 'A newer canonical title',
            version: version => version + 1,
          })

          story(
            executable.update,
            given(initialModel),
            message(updatedComment(executable, initialModel)),
            message(
              toParentMessageFor(executable)(
                IssueDetailsBinding,
                issueA.id,
                IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
              ),
            ),
            message(
              issueDetailMessage(
                executable,
                initialModel,
                IssueDetailMessage.ClickedDiscardChanges(),
              ),
            ),
            model(model => {
              const issueDetail = activeIssueDetailModel(model)

              expect(issueDetail.draft).toEqual(draftFromIssue(issueA))
              expect(issueDetail.commentComposer.body).toBe(commentBody)

              expect(retainedIssueDetailModel(model)).toMatchObject({
                issueId: issueA.id,
                baseline: revisionFromIssue(issueA),
                draft: draftFromIssue(issueA),
                commentComposer: { body: commentBody },
              })
            }),
          )

          story(
            executable.update,
            given(initialModel),
            message(updatedComment(executable, initialModel)),
            message(
              toParentMessageFor(executable)(
                IssueDetailsBinding,
                issueA.id,
                IssueDetailMessage.UpdatedTitle({ value: editedTitle }),
              ),
            ),
            message(
              Message.SucceededLoadWorkspace({
                workspace: modifyFields(initialWorkspace, {
                  issues: Array.map(issue =>
                    issue.id === newerIssue.id ? newerIssue : issue,
                  ),
                }),
              }),
            ),
            message(
              issueDetailMessage(
                executable,
                initialModel,
                IssueDetailMessage.ClickedReloadIssue(),
              ),
            ),
            model(model => {
              const issueDetail = activeIssueDetailModel(model)

              expect(issueDetail.baseline).toEqual(
                revisionFromIssue(newerIssue),
              )
              expect(issueDetail.draft).toEqual(draftFromIssue(newerIssue))
              expect(issueDetail.commentComposer.body).toBe(commentBody)
              expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())

              expect(retainedIssueDetailModel(model)).toMatchObject({
                issueId: newerIssue.id,
                baseline: revisionFromIssue(newerIssue),
                draft: draftFromIssue(newerIssue),
                commentComposer: { body: commentBody },
              })
            }),
          )
        }),
      ).pipe(Effect.provide(layer))
    },
  )
})

describe('Board moves', () => {
  const visibleWorkspaceOf = (model: Model) =>
    Option.getOrThrow(AsyncData.getData(visibleWorkspaceAsyncData(model)))

  const visibleIssueOf = (model: Model, issueId: string) =>
    Option.getOrThrow(
      Array.findFirst(
        visibleWorkspaceOf(model).issues,
        issue => issue.id === issueId,
      ),
    )

  const visibleIssueIds = (model: Model) =>
    Array.map(visibleWorkspaceOf(model).issues, issue => issue.id)

  const loadedBoardModel = (executable: TestBlock<typeof ApplicationBlock>) => {
    const init = executable.init
    const update = executable.update
    return update(
      init(
        Option.getOrThrow(
          Url.fromString('https://workspace.test/projects/platform/board'),
        ),
      ).model,
      Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
    ).model
  }

  const modelWithPendingIssueMove = (
    initialModel: Model,
    issueId: string,
    status: IssueStatus,
    insertionIndex: number,
  ) => {
    const issue = visibleIssueOf(initialModel, issueId)

    return modifyFields(initialModel, {
      issueMoveState: () =>
        IssueMoveState.MovingIssue({
          issueId,
          status,
          insertionIndex,
          expectedVersion: issue.version,
        }),
    })
  }

  const withWorkspaceIssue = (model: Model, issue: Issue) =>
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
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedBoardModel(executable)

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const movingModel = modelWithPendingIssueMove(
          initialModel,
          issue.id,
          'Done',
          0,
        )

        const title = 'A title edited after a failed move'
        return story(
          ApplicationBlock,
          given(movingModel),
          message(
            Message.ChangedUrl({
              url: url(issueRouter({ issueId: issue.id })),
            }),
          ),
          model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe('Done')
            expect(activeIssueDetailModel(model).baseline).toEqual(
              revisionFromIssue(issue),
            )
            expect(activeIssueDetailModel(model).draft).toEqual(
              draftFromIssue(issue),
            )
          }),
          message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'Offline',
              }),
            }),
          ),
          model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
            expect(activeIssueDetailModel(model).draft.status).toBe(
              issue.status,
            )
          }),
          messageFrom(
            IssueDetailsBinding,
            issue.id,
            IssueDetailBlock.Message.UpdatedTitle({ value: title }),
          ),
          messageFrom(
            IssueDetailsBinding,
            issue.id,
            IssueDetailBlock.Message.SubmittedIssueForm(),
          ),
          Command.expectExact(
            SaveIssue({
              issueId: issue.id,
              expectedVersion: issue.version,
              draft: modifyFields(draftFromIssue(issue), {
                title: () => title,
              }),
            }),
          ),
          Command.resolve(
            SaveIssue,
            IssueDetailBlock.Message.SucceededSaveIssue({
              savedIssue: savedIssueFromIssue(
                modifyFields(issue, {
                  title: () => title,
                  version: Number.increment,
                }),
              ),
              expectedVersion: issue.version,
            }),
          ),
          model(model => {
            expect(visibleIssueOf(model, issue.id).title).toBe(title)
            expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
          }),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'retains a teammate comment between an optimistic move and its rollback',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const toParentMessage = toParentMessageFor(executable)

        const initialModel = loadedBoardModel(executable)

        const issue = visibleIssueOf(initialModel, 'issue-103')

        const teammateComment = Comment.make({
          id: 'comment-during-move',
          authorId: 'maya',
          body: 'This arrived while the move was being saved.',
          createdAt: '2026-10-24T16:00:00.000Z',
        })

        const commentedIssue = modifyFields(issue, {
          comments: Array.append(teammateComment),
        })

        const itemId = draggableId(issue.id)

        const childMessage = (message: DragAndDropMessage) =>
          toParentMessage(
            IssueBoardsBinding,
            issue.projectId,
            toParentMessageFor(executable, IssueBoardsBinding)(
              DragAndDropBinding,
              message,
            ),
          )
        return story(
          executable.update,
          given(initialModel),
          message(
            childMessage(
              DragAndDropBlock.Message.ActivatedKeyboardDrag({
                itemId,
                containerId: containerId(issue.status),
                index: 0,
              }),
            ),
          ),
          message(
            childMessage(
              DragAndDropBlock.Message.PressedArrowKey({
                direction: 'NextContainer',
              }),
            ),
          ),
          DragAndDropTest.resolveKeyboardMove({
            binding: DragAndDropBinding,
            itemId,
            targetContainerId: containerId('Done'),
            targetIndex: 0,
          }),
          message(
            childMessage(DragAndDropBlock.Message.ConfirmedKeyboardDrop()),
          ),
          DragAndDropTest.settleFocus({
            binding: DragAndDropBinding,
            itemId,
          }),
          model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe('Done')
            expect(
              Option.getOrThrow(AsyncData.getData(model.workspaceAsyncData))
                .issues,
            ).toEqual(initialWorkspace.issues)

            expect(activeIssueBoardModel(model).announcement).toBe(
              'Moved to Done, position 1.',
            )
          }),
          Command.expectExact(
            MoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              expectedVersion: issue.version,
            }),
          ),
          message(
            Message.SucceededAppendActivity({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
          model((model: Model) => {
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
            expect(
              Array.findFirst(
                confirmedWorkspace.issues,
                current => current.id === issue.id,
              ),
            ).toEqual(Option.some(commentedIssue))
          }),
          Command.expectExact(
            MoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              expectedVersion: issue.version,
            }),
          ),
          Command.resolve(
            MoveIssue,
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'Offline',
              }),
            }),
          ),
          model((model: Model) => {
            expect(visibleIssueOf(model, issue.id).status).toBe(issue.status)
            expect(visibleIssueOf(model, issue.id).comments).toContainEqual(
              teammateComment,
            )

            expect(activeIssueBoardModel(model).announcement).toBe(
              'Could not save the move. Issue position restored.',
            )
          }),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'restores the original same-column placement and preserves a concurrent comment',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedBoardModel(executable)

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
        return story(
          ApplicationBlock,
          given(withWorkspaceIssue(movingModel, commentedIssue)),
          message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: issue.status,
              insertionIndex: 1,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'The move could not be saved.',
              }),
            }),
          ),
          model(model => {
            expect(visibleIssueIds(model)).toEqual(
              visibleIssueIds(initialModel),
            )
            expect(visibleIssueOf(model, issue.id)).toEqual(commentedIssue)
            expect(IssueMoveState.guards.FailedMove(model.issueMoveState)).toBe(
              true,
            )
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'preserves concurrent issue edits and unrelated rows when restoring the original global position',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedBoardModel(executable)

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
        return story(
          ApplicationBlock,
          given(
            withWorkspaceIssue(
              withWorkspaceIssue(movingModel, editedIssue),
              commentedUnrelatedIssue,
            ),
          ),
          message(
            Message.FailedMoveIssue({
              issueId: issue.id,
              status: 'Done',
              insertionIndex: 0,
              error: RepositoryError.Unavailable({
                operation: 'Move',
                message: 'The move could not be saved.',
              }),
            }),
          ),
          model(model => {
            expect(visibleIssueIds(model)).toEqual(
              visibleIssueIds(initialModel),
            )
            expect(visibleIssueOf(model, issue.id)).toEqual(editedIssue)
            expect(visibleIssueOf(model, unrelatedIssue.id)).toEqual(
              commentedUnrelatedIssue,
            )
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'restores placement before applying the canonical issue from a conflict result',
    () => {
      return withBlock(ApplicationBlock, executable => {
        const initialModel = loadedBoardModel(executable)

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
        return story(
          ApplicationBlock,
          given(movingModel),
          message(
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
          model(model => {
            expect(visibleIssueIds(model)).toEqual(
              visibleIssueIds(initialModel),
            )
            expect(visibleIssueOf(model, issue.id)).toEqual(latestIssue)
            expect(model.issueMoveState).toEqual(
              IssueMoveState.FailedMove({
                issueId: issue.id,
                status: 'Done',
                insertionIndex: 0,
                error: 'The issue changed before it could be moved.',
              }),
            )
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer))
    },
  )
})

describe('when refreshing the workspace with an unsaved issue draft', () => {
  it.effect(
    'keeps the canonical issue and editable draft after a failed refresh',
    () => {
      const title = 'Keep this draft while refreshing'

      const error = 'The workspace is temporarily unavailable.'
      return story(
        ApplicationBlock,
        init(url(issueRouter({ issueId: issueA.id }))),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        messageFrom(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: title }),
        ),
        message(Message.ClickedRetryLoad()),
        Command.expectExact(LoadWorkspace()),
        model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Refreshing')
          expect(visibleWorkspaceOf(model).issues).toContainEqual(issueA)

          expect(activeIssueDetailModel(model).draft.title).toBe(title)
        }),
        Command.resolve(LoadWorkspace, Message.FailedLoadWorkspace({ error })),
        model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Stale')
          expect(AsyncData.getError(model.workspaceAsyncData)).toEqual(
            Option.some(error),
          )
          expect(visibleWorkspaceOf(model).issues).toContainEqual(issueA)

          expect(activeIssueDetailModel(model).draft.title).toBe(title)
          expect(activeIssueDetailModel(model).maybeIncomingRevision).toEqual(
            Option.none(),
          )
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'publishes the refreshed issue and offers its revision without replacing the draft',
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
      return story(
        ApplicationBlock,
        init(url(issueRouter({ issueId: issueA.id }))),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        messageFrom(
          IssueDetailsBinding,
          issueA.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: title }),
        ),
        message(Message.ClickedRetryLoad()),
        Command.expectExact(LoadWorkspace()),
        Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: latestWorkspace }),
        ),
        model(model => {
          expect(model.workspaceAsyncData._tag).toBe('Success')
          expect(visibleWorkspaceOf(model).issues).toContainEqual(latestIssue)

          expect(activeIssueDetailModel(model).draft.title).toBe(title)
          expect(activeIssueDetailModel(model).maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(latestIssue)),
          )
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(layer))
    },
  )
})
