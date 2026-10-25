import { Array, Number, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { DragAndDrop, DragAndDropBlock } from '@foldkit/ui'

import { DragAndDropBinding } from './board/composition'
import { containerId, draggableId } from './board/dragAndDrop'
import {
  AppendActivity,
  AssignIssue,
  LoadWorkspace,
  MoveIssue,
  NavigateInternal,
  ReplaceInternalUrl,
} from './command'
import { CommentComposerBlock } from './commentComposer'
import { AddComment } from './commentComposer/command'
import { PostState } from './commentComposer/definition'
import {
  ActiveMemberBinding,
  IssueBoardBinding,
  IssueDetailBinding,
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
  RetainedIssueDraft,
  SavedView,
  initialSnapshot,
  mergeIssue,
  moveIssue,
} from './domain'
import { init } from './init'
import { IssueDetailBlock } from './issueDetail'
import { SaveIssue } from './issueDetail/command'
import { CommentComposerBinding } from './issueDetail/composition'
import {
  Message as IssueDetailMessage,
  SaveState,
} from './issueDetail/definition'
import { draftFromIssue, revisionFromIssue } from './issueDetail/draft'
import { IssueListBlock } from './issueList'
import { WorkspaceListboxBlock } from './listbox'
import { Message } from './message'
import {
  IssueMoveState,
  type Model,
  appliedIssueFilters,
  maybeActiveBoardInstance,
  maybeActiveIssueDetailInstance,
} from './model'
import { issueHref } from './navigation'
import { NotificationCenterBlock } from './notifications'
import { ProjectSettingsBlock } from './projectSettings'
import { SaveProject } from './projectSettings/command'
import { SaveState as ProjectSaveState } from './projectSettings/definition'
import { RepositoryError } from './repository'
import {
  ApplicationRoute,
  defaultIssueFilters,
  issueRouter,
  issuesRouter,
  pageRoute,
  projectRouter,
  routeToPath,
  savedViewRouter,
} from './route'
import { update } from './update'

const issueA = Option.getOrThrow(Array.head(initialSnapshot.issues))
const issueB = Option.getOrThrow(Array.get(initialSnapshot.issues, 1))
const issueC = Option.getOrThrow(Array.get(initialSnapshot.issues, 2))

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const loadedModel = (path = '/') => {
  const applicationInit = init(url(path))

  const workspaceLoad = update(
    applicationInit.model,
    Message.SucceededLoadWorkspace({ snapshot: initialSnapshot }),
  )

  return workspaceLoad.model
}

const detailInstance = (model: typeof Model.Type) =>
  Option.getOrThrow(maybeActiveIssueDetailInstance(model))

const boardInstance = (model: typeof Model.Type) =>
  Option.getOrThrow(maybeActiveBoardInstance(model))

const retainedDetailInstance = (model: typeof Model.Type, issueId: string) =>
  Option.getOrThrow(
    Array.findFirst(
      model.issueDetailInstances,
      instance => instance.issueId === issueId,
    ),
  )

const detailMessage = (
  model: typeof Model.Type,
  message: typeof IssueDetailBlock.Message.Type,
) => {
  const instance = detailInstance(model)

  return toParentMessage(IssueDetailBinding, instance.issueId, message)
}

const detailMessageFor = (
  issueId: string,
  message: typeof IssueDetailBlock.Message.Type,
) => toParentMessage(IssueDetailBinding, issueId, message)

const projectSettingsMessage = (
  projectId: string,
  message: typeof ProjectSettingsBlock.Message.Type,
) => toParentMessage(ProjectSettingsBinding, projectId, message)

const projectSettingsModel = (model: typeof Model.Type, projectId: string) =>
  Option.getOrThrow(
    Array.findFirst(
      model.projectSettingsInstances,
      instance => instance.projectId === projectId,
    ),
  ).model

describe('workspace navigation', () => {
  test('navigates to a project and returns there after closing an issue', () => {
    const projectPath = projectRouter({ projectId: issueB.projectId })

    story(
      update,
      given(loadedModel()),
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
          url: url(issueRouter({ issueId: issueB.id, returnTo: projectPath })),
        }),
      ),
      model(model => {
        expect(pageRoute(model.route)).toEqual(
          ApplicationRoute.Project({ projectId: issueB.projectId }),
        )
        expect(detailInstance(model).issueId).toBe(issueB.id)
      }),
    )

    const projectModel = loadedModel(projectPath)

    const issueOpen = update(
      projectModel,
      Message.ChangedUrl({
        url: url(issueRouter({ issueId: issueB.id, returnTo: projectPath })),
      }),
    )

    story(
      update,
      given(issueOpen.model),
      message(
        detailMessage(issueOpen.model, IssueDetailBlock.Message.ClickedClose()),
      ),
      Command.expectExact(NavigateInternal({ url: projectPath })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      message(Message.ChangedUrl({ url: url(projectPath) })),
      model(model => {
        expect(model.route).toEqual(
          ApplicationRoute.Project({ projectId: issueB.projectId }),
        )
        expect(model.issueDetailInstances).toHaveLength(1)
      }),
    )
  })

  test('retains the editor when leaving the issue route', () => {
    story(
      update,
      given(loadedModel(issueRouter({ issueId: issueA.id }))),
      message(Message.ChangedUrl({ url: url('/') })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Issues({}))
        expect(model.issueDetailInstances).toHaveLength(1)
      }),
      Command.expectNone(),
    )
  })

  test('reuses each retained editor when navigating between issues', () => {
    const initial = loadedModel(issueRouter({ issueId: issueA.id }))
    const issueAEditor = detailInstance(initial).model
    const issueBPath = issueRouter({ issueId: issueB.id })

    story(
      update,
      given(initial),
      message(Message.ChangedUrl({ url: url(issueBPath) })),
      model(model => {
        expect(detailInstance(model).issueId).toBe(issueB.id)
        expect(model.issueDetailInstances).toHaveLength(2)
      }),
      message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueA.id })),
        }),
      ),
      model(model => {
        expect(detailInstance(model).model).toBe(issueAEditor)
        expect(model.issueDetailInstances).toHaveLength(2)
      }),
      Command.expectNone(),
    )
  })

  test('settles a save while another issue is open', () => {
    const initial = loadedModel(issueRouter({ issueId: issueA.id }))
    const savedIssue = modifyFields(issueA, {
      title: () => 'Saved while another issue is open',
      version: Number.increment,
    })

    story(
      update,
      given(initial),
      message(
        detailMessageFor(
          issueA.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: savedIssue.title }),
        ),
      ),
      message(
        detailMessageFor(issueA.id, IssueDetailBlock.Message.RequestedSave()),
      ),
      message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueB.id })),
        }),
      ),
      model(model => expect(detailInstance(model).issueId).toBe(issueB.id)),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: issueA.version,
        }),
      ),
      model(model => {
        const hiddenEditor = retainedDetailInstance(model, issueA.id).model

        expect(detailInstance(model).issueId).toBe(issueB.id)
        expect(hiddenEditor.saveState).toEqual(SaveState.Idle())
        expect(hiddenEditor.baseline).toEqual(revisionFromIssue(savedIssue))
        expect(snapshotOf(model).issues).toContainEqual(savedIssue)
        expect(model.issueDrafts).toEqual([])
        expect(model.maybeNotice).toEqual(
          Option.some(`${savedIssue.identifier} saved`),
        )
      }),
      Command.expectNone(),
      message(
        detailMessageFor(issueB.id, IssueDetailBlock.Message.ClickedClose()),
      ),
      Command.expectExact(NavigateInternal({ url: '/' })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )
  })

  test('closes a direct issue URL to All issues', () => {
    const initial = loadedModel(issueRouter({ issueId: issueA.id }))

    story(
      update,
      given(initial),
      message(detailMessage(initial, IssueDetailBlock.Message.ClickedClose())),
      Command.expectExact(NavigateInternal({ url: '/' })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )
  })

  test('reconciles every retained editor from a refreshed snapshot', () => {
    const initial = loadedModel(issueRouter({ issueId: issueA.id }))
    const latestIssueA = modifyFields(issueA, {
      title: () => 'A clean hidden editor receives the refresh',
      version: Number.increment,
    })
    const latestIssueB = modifyFields(issueB, {
      title: () => 'A remote title conflicts with a retained draft',
      version: Number.increment,
    })
    const refreshedSnapshot = modifyFields(initialSnapshot, {
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

    story(
      update,
      given(initial),
      message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueB.id })),
        }),
      ),
      message(
        detailMessageFor(
          issueB.id,
          IssueDetailBlock.Message.UpdatedTitle({ value: localTitle }),
        ),
      ),
      message(
        Message.ChangedUrl({
          url: url(issueRouter({ issueId: issueC.id })),
        }),
      ),
      message(Message.ChangedUrl({ url: url('/people') })),
      message(Message.SucceededLoadWorkspace({ snapshot: refreshedSnapshot })),
      model(model => {
        const retainedIssueA = retainedDetailInstance(model, issueA.id).model
        const retainedIssueB = retainedDetailInstance(model, issueB.id).model
        const retainedIssueC = retainedDetailInstance(model, issueC.id).model

        expect(maybeActiveIssueDetailInstance(model)).toEqual(Option.none())
        expect(retainedIssueA.baseline).toEqual(revisionFromIssue(latestIssueA))
        expect(retainedIssueA.draft).toEqual(draftFromIssue(latestIssueA))
        expect(retainedIssueB.draft.title).toBe(localTitle)
        expect(retainedIssueB.maybeIncomingRevision).toEqual(
          Option.some(revisionFromIssue(latestIssueB)),
        )
        expect(retainedIssueC.baseline).toEqual(revisionFromIssue(issueC))
      }),
      Command.expectNone(),
    )
  })
})

const unrelatedIssue = Option.getOrThrow(
  Array.findFirst(initialSnapshot.issues, issue => issue.id === 'issue-104'),
)

const snapshotOf = (model: typeof Model.Type) =>
  Option.getOrThrow(AsyncData.getData(model.workspaceAsyncData))

const visibleNotifications = (model: typeof Model.Type) =>
  Array.filter(
    model.notificationCenter.notifications,
    notification => notification.recipientId === model.activeMemberId,
  )

const notificationMessage = (
  childMessage: typeof NotificationCenterBlock.Message.Type,
) => toParentMessage(NotificationCenterBinding, childMessage)

const activeMemberMessage = (memberId: string) =>
  toParentMessage(
    ActiveMemberBinding,
    WorkspaceListboxBlock.Message.RequestedSelectItem({ item: memberId }),
  )

describe('workspace notifications', () => {
  test('deduplicates comment notifications and preserves read state across late arrivals', () => {
    const initial = loadedModel()
    const body = 'I checked the latest changes. This is ready for another look.'
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

    story(
      update,
      given(initial),
      message(Message.ClickedSimulateActivity()),
      Command.expectExact(
        AppendActivity({ issueId: issueA.id, authorId: 'alex', body }),
      ),
      Command.resolve(
        AppendActivity,
        Message.SucceededAppendActivity({ issue: commentedIssue }),
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
      message(
        notificationMessage(
          NotificationCenterBlock.Message.ClickedNotificationReadState({
            notificationId,
            recipientId: 'maya',
          }),
        ),
      ),
      message(Message.SucceededAppendActivity({ issue: commentedIssue })),
      message(Message.SucceededAppendActivity({ issue: staleIssue })),
      model(model => {
        expect(visibleNotifications(model)).toEqual([
          expect.objectContaining({
            id: `comment:${staleComment.id}:maya`,
            isRead: false,
          }),
          expect.objectContaining({ id: notificationId, isRead: true }),
        ])

        const canonicalIssue = Option.getOrThrow(
          Array.findFirst(
            snapshotOf(model).issues,
            issue => issue.id === issueA.id,
          ),
        )

        expect(canonicalIssue).toEqual(mergeIssue(commentedIssue, staleIssue))
        expect(canonicalIssue.comments).toContainEqual(staleComment)
      }),
      Command.expectNone(),
    )
  })

  test('keeps background activity relevant and clears a failed event after assignment succeeds', () => {
    const initial = loadedModel(issueRouter({ issueId: issueB.id }))
    const assignedIssue = modifyFields(issueB, {
      version: version => version + 1,
      maybeAssigneeId: () => Option.some('maya'),
    })

    story(
      update,
      given(initial),
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
          issue: assignedIssue,
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
    )
  })

  test('keeps own and unrelated comments outside the active member view', () => {
    const initial = loadedModel()
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

    story(
      update,
      given(initial),
      message(Message.SucceededAppendActivity({ issue: ownCommentIssue })),
      message(
        Message.SucceededAppendActivity({ issue: unrelatedCommentIssue }),
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
    )
  })

  test('isolates read state by member and routes a selected notification', () => {
    const initial = loadedModel()
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

    story(
      update,
      given(initial),
      message(Message.SucceededAppendActivity({ issue: commentedIssue })),
      message(
        Message.SucceededAssignIssue({
          issue: assignedIssue,
          actorId: 'jordan',
          createdAt: '2026-10-24T15:05:00.000Z',
        }),
      ),
      message(
        notificationMessage(
          NotificationCenterBlock.Message.ClickedMarkAllAsRead({
            recipientId: 'maya',
          }),
        ),
      ),
      model(model => {
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
      message(activeMemberMessage('alex')),
      model(model => {
        expect(model.activeMemberId).toBe('alex')
        expect(visibleNotifications(model)).toEqual([
          expect.objectContaining({ id: alexNotificationId, isRead: false }),
        ])
      }),
      message(
        notificationMessage(
          NotificationCenterBlock.Message.ClickedNotification({
            notificationId: alexNotificationId,
            recipientId: 'alex',
          }),
        ),
      ),
      Command.expectExact(
        NavigateInternal({ url: issueHref(initial, issueA.id) }),
      ),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      model(model => {
        expect(visibleNotifications(model)).toEqual([
          expect.objectContaining({ id: alexNotificationId, isRead: true }),
        ])
      }),
    )
  })

  test('preserves a foreground notice when background activity succeeds', () => {
    story(
      update,
      given(
        modifyFields(loadedModel(), {
          maybeNotice: () => Option.some('Saved view “My work”'),
        }),
      ),
      message(Message.SucceededAppendActivity({ issue: issueA })),
      model(model => {
        expect(model.maybeNotice).toEqual(Option.some('Saved view “My work”'))
      }),
      Command.expectNone(),
    )
  })
})

describe('workspace project settings', () => {
  const project = Option.getOrThrow(Array.head(initialSnapshot.projects))
  const anotherProject = Option.getOrThrow(
    Array.findFirst(
      initialSnapshot.projects,
      candidate => candidate.id !== project.id,
    ),
  )
  const projectSettingsPath = `/projects/${project.id}/settings`

  test('preserves project edits when the current URL is delivered again', () => {
    const initial = loadedModel(projectSettingsPath)

    story(
      update,
      given(initial),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished project name',
          }),
        ),
      ),
      message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
      model(model => {
        expect(projectSettingsModel(model, project.id).draft.name).toBe(
          'Unfinished project name',
        )
      }),
      Command.expectNone(),
    )
  })

  test('keeps separate drafts across project switches and workspace refreshes', () => {
    const initial = loadedModel(projectSettingsPath)

    story(
      update,
      given(initial),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished platform work',
          }),
        ),
      ),
      message(
        Message.ChangedUrl({
          url: url(`/projects/${anotherProject.id}/settings`),
        }),
      ),
      model(model => {
        expect(projectSettingsModel(model, anotherProject.id).draft.name).toBe(
          anotherProject.name,
        )
      }),
      message(Message.SucceededLoadWorkspace({ snapshot: initialSnapshot })),
      message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
      model(model => {
        expect(projectSettingsModel(model, project.id).draft.name).toBe(
          'Unfinished platform work',
        )
        expect(model.projectSettingsInstances).toHaveLength(2)
      }),
      Command.expectNone(),
    )
  })

  test('saves project settings while an unrelated issue move is pending', () => {
    const savedProject = modifyFields(project, { name: () => 'New name' })
    const initial = modifyFields(loadedModel(projectSettingsPath), {
      issueMoveState: () =>
        IssueMoveState.MovingIssue({
          issueId: issueA.id,
          previousStatus: issueA.status,
          previousIndex: 0,
          expectedVersion: issueA.version,
        }),
    })

    story(
      update,
      given(initial),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: savedProject.name,
          }),
        ),
      ),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.SubmittedProjectSettings(),
        ),
      ),
      Command.expectExact(SaveProject({ project: savedProject })),
      Command.resolve(
        SaveProject,
        ProjectSettingsBlock.Message.SucceededSaveProject({
          project: savedProject,
        }),
      ),
    )
  })

  test('settles a project save after navigating away without touching another editor', () => {
    const savedProject = modifyFields(project, {
      name: () => 'Saved while away',
    })
    const initial = modifyFields(loadedModel(projectSettingsPath), {
      projectSettingsInstances: Array.map(instance =>
        modifyFields(instance, {
          model: model =>
            modifyFields(model, {
              draft: () => ({
                name: savedProject.name,
                description: savedProject.description,
              }),
              saveState: () => ProjectSaveState.Saving(),
            }),
        }),
      ),
    })

    story(
      update,
      given(initial),
      message(
        Message.ChangedUrl({
          url: url(`/projects/${anotherProject.id}/settings`),
        }),
      ),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.SucceededSaveProject({
            project: savedProject,
          }),
        ),
      ),
      model(model => {
        expect(projectSettingsModel(model, project.id).baseline).toEqual(
          savedProject,
        )
        expect(projectSettingsModel(model, anotherProject.id).draft.name).toBe(
          anotherProject.name,
        )
        expect(model.route).toEqual(
          ApplicationRoute.ProjectSettings({
            projectId: anotherProject.id,
          }),
        )
      }),
      message(Message.SucceededMoveIssue({ snapshot: initialSnapshot })),
      model(model => {
        expect(snapshotOf(model).projects).toContainEqual(savedProject)
      }),
      Command.expectNone(),
    )
  })

  test('publishes only the project returned by a completed save', () => {
    const initial = loadedModel(projectSettingsPath)
    const savedProject = modifyFields(project, {
      name: () => 'Platform engineering',
    })

    story(
      update,
      given(initial),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: savedProject.name,
          }),
        ),
      ),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettingsBlock.Message.SubmittedProjectSettings(),
        ),
      ),
      Command.expectExact(SaveProject({ project: savedProject })),
      Command.resolve(
        SaveProject,
        ProjectSettingsBlock.Message.SucceededSaveProject({
          project: savedProject,
        }),
      ),
      model(model => {
        expect(snapshotOf(model).projects).toContainEqual(savedProject)
        expect(snapshotOf(model).issues).toEqual(initialSnapshot.issues)
      }),
    )
  })

  test('does not initialize settings for an unknown project', () => {
    story(
      update,
      given(loadedModel('/projects/missing/settings')),
      model(model => {
        expect(model.projectSettingsInstances).toEqual([])
      }),
      Command.expectNone(),
    )
  })
})

describe('Application child policies', () => {
  const listMessage = (message: typeof IssueListBlock.Message.Type) =>
    toParentMessage(IssueListBinding, message)

  test('retains one Board instance per project across navigation', () => {
    const initial = loadedModel('/projects/platform/board')
    const board = boardInstance(initial)
    const issue = Option.getOrThrow(
      Array.findFirst(
        initialSnapshot.issues,
        issue => issue.projectId === 'platform',
      ),
    )

    story(
      update,
      given(initial),
      message(
        Message.ChangedUrl({
          url: url(
            issueRouter({
              issueId: issue.id,
              returnTo: '/projects/platform/board',
            }),
          ),
        }),
      ),
      model(model => {
        expect(boardInstance(model)).toBe(board)
      }),
      message(Message.ChangedUrl({ url: url('/projects/platform/board') })),
      model(model => {
        expect(boardInstance(model)).toBe(board)
      }),
      message(Message.ChangedUrl({ url: url('/projects/experience/board') })),
      model(model => {
        const switchedBoard = boardInstance(model)

        expect(switchedBoard.projectId).toBe('experience')
        expect(switchedBoard).not.toBe(board)
      }),
      message(Message.ChangedUrl({ url: url('/people') })),
      model(model => {
        expect(maybeActiveBoardInstance(model)).toEqual(Option.none())
        expect(model.boardInstances).toHaveLength(2)
      }),
      Command.expectNone(),
    )

    story(
      update,
      given(loadedModel('/projects/missing/board')),
      model(model => {
        expect(model.boardInstances).toEqual([])
      }),
      Command.expectNone(),
    )
  })

  test('retains a failed move for retry and uses the refreshed revision', () => {
    const initial = loadedModel('/projects/platform/board')
    const issue = Option.getOrThrow(
      Array.findFirst(
        initialSnapshot.issues,
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

    story(
      update,
      given(initial),
      message(conflict),
      model(model => {
        expect(snapshotOf(model).issues).toContainEqual(latestIssue)
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
    )
  })

  test('routes Issue List facts through filter Commands and saves the applied filters', () => {
    const initial = loadedModel()
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

    story(
      update,
      given(initial),
      message(
        listMessage(IssueListBlock.Message.UpdatedQuery({ value: 'keyboard' })),
      ),
      Command.expectExact(
        ReplaceInternalUrl({ url: issuesRouter({ filters: queriedFilters }) }),
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
      message(
        listMessage(
          IssueListBlock.Message.UpdatedGrouping({ value: 'Project' }),
        ),
      ),
      Command.expectExact(
        NavigateInternal({ url: issuesRouter({ filters: savedFilters }) }),
      ),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
      message(
        Message.ChangedUrl({
          url: url(issuesRouter({ filters: savedFilters })),
        }),
      ),
      message(
        listMessage(
          IssueListBlock.Message.UpdatedSavedViewName({
            value: 'Keyboard work',
          }),
        ),
      ),
      message(
        listMessage(
          IssueListBlock.Message.SubmittedSavedView({ filters: savedFilters }),
        ),
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
      message(listMessage(IssueListBlock.Message.RequestedClearFilters())),
      Command.expectExact(
        NavigateInternal({ url: issuesRouter({ filters: clearedFilters }) }),
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
    )
  })

  test('restores saved filters and preserves explicit URL overrides', () => {
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
    const initial = modifyFields(loadedModel(), {
      savedViews: () => [savedView],
      nextSavedViewId: () => 2,
    })

    story(
      update,
      given(initial),
      message(Message.ChangedUrl({ url: url('/views/view-1') })),
      model(model => {
        expect(appliedIssueFilters(model)).toEqual(savedFilters)
      }),
      message(
        Message.ChangedUrl({ url: url('/views/view-1?search=override') }),
      ),
      model(model => {
        expect(appliedIssueFilters(model)).toEqual(
          IssueFilters.make({ ...defaultIssueFilters, query: 'override' }),
        )
      }),
      message(Message.ChangedUrl({ url: url('/views/view-1?filters=1') })),
      model(model => {
        expect(appliedIssueFilters(model)).toEqual(defaultIssueFilters)
      }),
      Command.expectNone(),
    )
  })

  test('deletes unrelated and displayed saved views without changing filters', () => {
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
    const initial = modifyFields(loadedModel(displayedPath), {
      savedViews: () => [displayedView, unrelatedView],
      nextSavedViewId: () => 3,
    })

    story(
      update,
      given(initial),
      message(Message.ClickedDeleteSavedView({ viewId: unrelatedView.id })),
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

    story(
      update,
      given(initial),
      message(Message.ClickedDeleteSavedView({ viewId: displayedView.id })),
      model(model => {
        expect(model.savedViews).toEqual([unrelatedView])
        expect(appliedIssueFilters(model)).toEqual(savedFilters)
      }),
      Command.expectExact(NavigateInternal({ url: issuesPath })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )
  })

  test('deleting a saved view behind an issue preserves its filters for close', () => {
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
    const backgroundPath = routeToPath(
      ApplicationRoute.SavedView({
        viewId: savedView.id,
        filters: changedFilters,
      }),
    )
    const issuePath = issueRouter({
      issueId: 'issue-102',
      returnTo: backgroundPath,
    })
    const issuesPath = issuesRouter({ filters: changedFilters })
    const repairedIssuePath = issueRouter({
      issueId: 'issue-102',
      returnTo: issuesPath,
    })
    const initial = modifyFields(loadedModel(issuePath), {
      savedViews: () => [savedView],
      nextSavedViewId: () => 2,
    })

    story(
      update,
      given(initial),
      message(Message.ClickedDeleteSavedView({ viewId: savedView.id })),
      Command.expectExact(ReplaceInternalUrl({ url: repairedIssuePath })),
      model(model => {
        expect(model.savedViews).toEqual([])

        expect(model.route).toEqual(
          ApplicationRoute.Issue({
            issueId: 'issue-102',
            returnTo: issuesPath,
          }),
        )
        expect(pageRoute(model.route)).toEqual(
          ApplicationRoute.Issues({ filters: changedFilters }),
        )
        expect(appliedIssueFilters(model)).toEqual(changedFilters)
      }),
      Command.resolve(
        ReplaceInternalUrl,
        Message.CompletedReplaceInternalUrl(),
      ),
      message(Message.ChangedUrl({ url: url(repairedIssuePath) })),
      message(detailMessage(initial, IssueDetailBlock.Message.ClickedClose())),
      Command.expectExact(NavigateInternal({ url: issuesPath })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )
  })

  test('requests teammate activity from the always-on stream fact', () => {
    const initial = loadedModel()

    story(
      update,
      given(initial),
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
    )
  })
})

describe('Issue drafts', () => {
  const issueA = Option.getOrThrow(Array.head(initialSnapshot.issues))
  const issueB = Option.getOrThrow(Array.get(initialSnapshot.issues, 1))
  const editedTitle = 'A retained issue title'
  const commentBody = 'Keep this comment while I move around.'

  const url = (path: string) =>
    Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

  const issuePath = (issueId: string) => issueRouter({ issueId })

  const loadedModel = (issueId = issueA.id) =>
    update(
      init(url(issuePath(issueId))).model,
      Message.SucceededLoadWorkspace({ snapshot: initialSnapshot }),
    ).model

  const detailInstance = (model: typeof Model.Type) =>
    Option.getOrThrow(maybeActiveIssueDetailInstance(model))

  const detailMessage = (
    model: typeof Model.Type,
    childMessage: typeof IssueDetailBlock.Message.Type,
  ) => {
    const instance = detailInstance(model)

    return toParentMessage(IssueDetailBinding, instance.issueId, childMessage)
  }

  const commentMessage = (
    model: typeof Model.Type,
    childMessage: typeof CommentComposerBlock.Message.Type,
  ) => {
    const messageForDetail = toParentMessage(
      CommentComposerBinding,
      childMessage,
    )

    return detailMessage(model, messageForDetail)
  }

  const retainedDraft = (model: typeof Model.Type, issueId = issueA.id) =>
    Option.getOrThrow(
      Array.findFirst(model.issueDrafts, draft => draft.issueId === issueId),
    )

  const canonicalIssue = (model: typeof Model.Type, issueId = issueA.id) =>
    Option.getOrThrow(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), snapshot =>
        Array.findFirst(snapshot.issues, issue => issue.id === issueId),
      ),
    )

  const updatedTitle = (model: typeof Model.Type, value = editedTitle) =>
    detailMessage(model, IssueDetailMessage.UpdatedTitle({ value }))

  const updatedComment = (model: typeof Model.Type, value = commentBody) =>
    commentMessage(model, CommentComposerBlock.Message.UpdatedBody({ value }))

  test('retains field edits and removes the snapshot when it becomes clean', () => {
    const initial = loadedModel()

    story(
      update,
      given(initial),
      message(updatedTitle(initial)),
      model(model => {
        expect(retainedDraft(model)).toEqual(
          RetainedIssueDraft.make({
            issueId: issueA.id,
            baseline: revisionFromIssue(issueA),
            draft: modifyFields(draftFromIssue(issueA), {
              title: () => editedTitle,
            }),
            commentBody: '',
          }),
        )
      }),
      message(updatedTitle(initial, issueA.title)),
      model(model => expect(model.issueDrafts).toEqual([])),
    )
  })

  test('retains a comment by itself and alongside field edits', () => {
    const initial = loadedModel()

    story(
      update,
      given(initial),
      message(updatedComment(initial)),
      model(model => {
        expect(retainedDraft(model)).toEqual(
          RetainedIssueDraft.make({
            issueId: issueA.id,
            baseline: revisionFromIssue(issueA),
            draft: draftFromIssue(issueA),
            commentBody,
          }),
        )
      }),
      message(updatedTitle(initial)),
      model(model => {
        expect(retainedDraft(model).draft.title).toBe(editedTitle)
        expect(retainedDraft(model).commentBody).toBe(commentBody)
      }),
      message(updatedComment(initial, '')),
      model(model =>
        expect(retainedDraft(model).draft.title).toBe(editedTitle),
      ),
      message(updatedTitle(initial, issueA.title)),
      model(model => expect(model.issueDrafts).toEqual([])),
    )
  })

  test('preserves an unsent comment after saving fields and clears a field-only snapshot', () => {
    const initial = loadedModel()
    const savedIssue = modifyFields(issueA, {
      title: () => editedTitle,
      version: version => version + 1,
    })

    story(
      update,
      given(initial),
      message(updatedComment(initial)),
      message(updatedTitle(initial)),
      message(detailMessage(initial, IssueDetailMessage.RequestedSave())),
      Command.resolve(
        SaveIssue,
        IssueDetailMessage.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: issueA.version,
        }),
      ),
      model(model => {
        expect(retainedDraft(model)).toEqual(
          RetainedIssueDraft.make({
            issueId: savedIssue.id,
            baseline: revisionFromIssue(savedIssue),
            draft: draftFromIssue(savedIssue),
            commentBody,
          }),
        )
      }),
      Command.expectNone(),
    )

    story(
      update,
      given(initial),
      message(updatedTitle(initial)),
      message(detailMessage(initial, IssueDetailMessage.RequestedSave())),
      Command.resolve(
        SaveIssue,
        IssueDetailMessage.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: issueA.version,
        }),
      ),
      model(model => expect(model.issueDrafts).toEqual([])),
      Command.expectNone(),
    )
  })

  test('rebases retained field edits after a comment succeeds', () => {
    const initial = loadedModel()
    const savedComment = Comment.make({
      id: 'comment-retained-draft',
      authorId: initial.activeMemberId,
      body: commentBody,
      createdAt: '2026-10-23T12:00:00.000Z',
    })
    const issueWithComment = modifyFields(issueA, {
      comments: Array.append(savedComment),
    })

    story(
      update,
      given(initial),
      message(updatedTitle(initial)),
      message(updatedComment(initial)),
      message(
        commentMessage(
          initial,
          CommentComposerBlock.Message.SubmittedCommentForm({
            authorId: initial.activeMemberId,
          }),
        ),
      ),
      Command.resolve(
        AddComment,
        CommentComposerBlock.Message.SucceededAddComment({
          issue: issueWithComment,
        }),
      ),
      model(model => {
        const detail = detailInstance(model).model
        const retained = retainedDraft(model)

        expect(detail.maybeIncomingRevision).toEqual(Option.none())
        expect(detail.saveState._tag).toBe('Idle')
        expect(detail.commentComposer.body).toBe('')

        expect(retained.baseline).toEqual(revisionFromIssue(issueWithComment))
        expect(retained.draft.title).toBe(editedTitle)
        expect(retained.commentBody).toBe('')
      }),
      Command.expectNone(),
    )
  })

  test('keeps the newest issue when save and comment successes arrive out of order', () => {
    const initial = loadedModel()
    const savedIssue = modifyFields(issueA, {
      title: () => editedTitle,
      version: version => version + 1,
    })
    const savedComment = Comment.make({
      id: 'comment-after-save',
      authorId: initial.activeMemberId,
      body: commentBody,
      createdAt: '2026-10-23T12:02:00.000Z',
    })
    const commentedIssue = modifyFields(savedIssue, {
      comments: Array.append(savedComment),
    })

    const pending = modifyFields(initial, {
      issueDetailInstances: Array.map(instance =>
        modifyFields(instance, {
          model: detail =>
            modifyFields(detail, {
              draft: draft => modifyFields(draft, { title: () => editedTitle }),
              saveState: () =>
                SaveState.Saving({ expectedVersion: issueA.version }),
              commentComposer: composer =>
                modifyFields(composer, {
                  body: () => commentBody,
                  postState: () => PostState.Posting(),
                }),
            }),
        }),
      ),
      issueDrafts: () => [
        RetainedIssueDraft.make({
          issueId: issueA.id,
          baseline: revisionFromIssue(issueA),
          draft: modifyFields(draftFromIssue(issueA), {
            title: () => editedTitle,
          }),
          commentBody,
        }),
      ],
    })

    story(
      update,
      given(pending),
      message(
        commentMessage(
          pending,
          CommentComposerBlock.Message.SucceededAddComment({
            issue: commentedIssue,
          }),
        ),
      ),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.saveState).toEqual({
          _tag: 'Saving',
          expectedVersion: issueA.version,
        })
        expect(detail.baseline).toEqual(revisionFromIssue(commentedIssue))
      }),
      message(
        detailMessage(
          pending,
          IssueDetailMessage.SucceededSaveIssue({
            issue: savedIssue,
            expectedVersion: issueA.version,
          }),
        ),
      ),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(commentedIssue))
        expect(detail.draft).toEqual(draftFromIssue(commentedIssue))
        expect(detail.saveState._tag).toBe('Idle')
        expect(detail.commentComposer.body).toBe('')

        expect(canonicalIssue(model)).toEqual(commentedIssue)
        expect(model.issueDrafts).toEqual([])
      }),
    )
  })

  test('merges out-of-order comments without losing newer activity', () => {
    const initial = loadedModel()
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
      authorId: initial.activeMemberId,
      body: commentBody,
      createdAt: '2026-10-23T12:03:00.000Z',
    })
    const olderCommentIssue = modifyFields(issueA, {
      comments: Array.append(postedComment),
    })

    const pending = modifyFields(initial, {
      issueDetailInstances: Array.map(instance =>
        modifyFields(instance, {
          model: detail =>
            modifyFields(detail, {
              commentComposer: composer =>
                modifyFields(composer, {
                  body: () => commentBody,
                  postState: () => PostState.Posting(),
                }),
            }),
        }),
      ),
      issueDrafts: () => [
        RetainedIssueDraft.make({
          issueId: issueA.id,
          baseline: revisionFromIssue(issueA),
          draft: draftFromIssue(issueA),
          commentBody,
        }),
      ],
    })

    story(
      update,
      given(pending),
      message(Message.SucceededAppendActivity({ issue: latestIssue })),
      message(
        commentMessage(
          pending,
          CommentComposerBlock.Message.SucceededAddComment({
            issue: olderCommentIssue,
          }),
        ),
      ),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(latestIssue))
        expect(detail.draft).toEqual(draftFromIssue(latestIssue))
        expect(detail.commentComposer.body).toBe('')

        expect(canonicalIssue(model)).toEqual(
          mergeIssue(latestIssue, olderCommentIssue),
        )
        expect(model.issueDrafts).toEqual([])
      }),
    )
  })

  test('rebases a comment-only snapshot when shared issue data changes', () => {
    const initial = loadedModel()
    const activityComment = Comment.make({
      id: 'comment-observed-activity',
      authorId: 'jordan',
      body: 'An update from another teammate.',
      createdAt: '2026-10-23T12:05:00.000Z',
    })
    const observedIssue = modifyFields(issueA, {
      comments: Array.append(activityComment),
    })

    story(
      update,
      given(initial),
      message(updatedComment(initial)),
      message(Message.SucceededAppendActivity({ issue: observedIssue })),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(observedIssue))
        expect(detail.draft).toEqual(draftFromIssue(observedIssue))
        expect(detail.maybeIncomingRevision).toEqual(Option.none())
        expect(detail.commentComposer.body).toBe(commentBody)

        expect(retainedDraft(model)).toEqual(
          RetainedIssueDraft.make({
            issueId: observedIssue.id,
            baseline: revisionFromIssue(observedIssue),
            draft: draftFromIssue(observedIssue),
            commentBody,
          }),
        )
      }),
      message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
      message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(observedIssue))
        expect(detail.draft).toEqual(draftFromIssue(observedIssue))
        expect(detail.maybeIncomingRevision).toEqual(Option.none())
        expect(detail.commentComposer.body).toBe(commentBody)
      }),
    )
  })

  test('rebases dirty fields over a newer comment-only revision', () => {
    const initial = loadedModel()
    const activityComment = Comment.make({
      id: 'comment-field-rebase',
      authorId: 'jordan',
      body: 'The editable issue fields did not change.',
      createdAt: '2026-10-23T12:06:00.000Z',
    })
    const observedIssue = modifyFields(issueA, {
      comments: Array.append(activityComment),
    })

    story(
      update,
      given(initial),
      message(updatedTitle(initial)),
      message(Message.SucceededAppendActivity({ issue: observedIssue })),
      model(model => {
        const detail = detailInstance(model).model
        const retained = retainedDraft(model)

        expect(detail.baseline).toEqual(revisionFromIssue(observedIssue))
        expect(detail.draft.title).toBe(editedTitle)
        expect(detail.maybeIncomingRevision).toEqual(Option.none())
        expect(detail.saveState._tag).toBe('Idle')

        expect(retained.baseline).toEqual(revisionFromIssue(observedIssue))
        expect(retained.draft.title).toBe(editedTitle)
      }),
    )
  })

  test('reconciles retained state when reopening after compatible and conflicting changes', () => {
    const initial = loadedModel()
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
    const renamedSnapshot = modifyFields(initialSnapshot, {
      issues: Array.map(issue =>
        issue.id === renamedIssue.id ? renamedIssue : issue,
      ),
    })

    story(
      update,
      given(initial),
      message(updatedTitle(initial)),
      message(updatedComment(initial)),
      message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
      message(Message.SucceededAppendActivity({ issue: commentedIssue })),
      message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(commentedIssue))
        expect(detail.draft.title).toBe(editedTitle)
        expect(detail.commentComposer.body).toBe(commentBody)
        expect(detail.maybeIncomingRevision).toEqual(Option.none())
        expect(detail.saveState._tag).toBe('Idle')
      }),
    )

    story(
      update,
      given(initial),
      message(updatedComment(initial)),
      message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
      message(Message.SucceededLoadWorkspace({ snapshot: renamedSnapshot })),
      message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(renamedIssue))
        expect(detail.draft).toEqual(draftFromIssue(renamedIssue))
        expect(detail.commentComposer.body).toBe(commentBody)
        expect(detail.maybeIncomingRevision).toEqual(Option.none())
        expect(detail.saveState._tag).toBe('Idle')
      }),
    )

    story(
      update,
      given(initial),
      message(updatedTitle(initial)),
      message(updatedComment(initial)),
      message(Message.ChangedUrl({ url: url(issuePath(issueB.id)) })),
      message(Message.SucceededLoadWorkspace({ snapshot: renamedSnapshot })),
      message(Message.ChangedUrl({ url: url(issuePath(issueA.id)) })),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(issueA))
        expect(detail.draft.title).toBe(editedTitle)
        expect(detail.commentComposer.body).toBe(commentBody)
        expect(detail.maybeIncomingRevision).toEqual(
          Option.some(revisionFromIssue(renamedIssue)),
        )
        expect(detail.saveState).toEqual(SaveState.Idle())
      }),
    )
  })

  test('discarding or reloading field edits preserves an unsent comment', () => {
    const initial = loadedModel()
    const newerIssue = modifyFields(issueA, {
      title: () => 'A newer canonical title',
      version: version => version + 1,
    })

    story(
      update,
      given(initial),
      message(updatedComment(initial)),
      message(updatedTitle(initial)),
      message(
        detailMessage(initial, IssueDetailMessage.ClickedDiscardChanges()),
      ),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.draft).toEqual(draftFromIssue(issueA))
        expect(detail.commentComposer.body).toBe(commentBody)

        expect(retainedDraft(model)).toEqual(
          RetainedIssueDraft.make({
            issueId: issueA.id,
            baseline: revisionFromIssue(issueA),
            draft: draftFromIssue(issueA),
            commentBody,
          }),
        )
      }),
    )

    story(
      update,
      given(initial),
      message(updatedComment(initial)),
      message(updatedTitle(initial)),
      message(Message.SucceededAppendActivity({ issue: newerIssue })),
      message(detailMessage(initial, IssueDetailMessage.ClickedReloadIssue())),
      model(model => {
        const detail = detailInstance(model).model

        expect(detail.baseline).toEqual(revisionFromIssue(newerIssue))
        expect(detail.draft).toEqual(draftFromIssue(newerIssue))
        expect(detail.commentComposer.body).toBe(commentBody)
        expect(detail.maybeIncomingRevision).toEqual(Option.none())

        expect(retainedDraft(model)).toEqual(
          RetainedIssueDraft.make({
            issueId: newerIssue.id,
            baseline: revisionFromIssue(newerIssue),
            draft: draftFromIssue(newerIssue),
            commentBody,
          }),
        )
      }),
    )
  })
})

describe('Board moves', () => {
  const workspaceOf = (model: typeof Model.Type) =>
    Option.getOrThrow(AsyncData.getData(model.workspaceAsyncData))

  const issueOf = (model: typeof Model.Type, issueId: string) =>
    Option.getOrThrow(
      Array.findFirst(workspaceOf(model).issues, issue => issue.id === issueId),
    )

  const issueIds = (model: typeof Model.Type) =>
    Array.map(workspaceOf(model).issues, issue => issue.id)

  const loadedBoard = () =>
    update(
      init(
        Option.getOrThrow(
          Url.fromString('https://workspace.test/projects/platform/board'),
        ),
      ).model,
      Message.SucceededLoadWorkspace({ snapshot: initialSnapshot }),
    ).model

  const pendingMoveModel = (
    initial: typeof Model.Type,
    issueId: string,
    status: typeof IssueStatus.Type,
    insertionIndex: number,
  ) => {
    const issue = issueOf(initial, issueId)
    const previousIndex = Option.getOrThrow(
      Array.findFirstIndex(
        workspaceOf(initial).issues,
        current => current.id === issueId,
      ),
    )

    return modifyFields(initial, {
      workspaceAsyncData: AsyncData.map(snapshot =>
        modifyFields(snapshot, {
          issues: issues => moveIssue(issues, issueId, status, insertionIndex),
        }),
      ),
      issueMoveState: () =>
        IssueMoveState.MovingIssue({
          issueId,
          previousStatus: issue.status,
          previousIndex,
          expectedVersion: issue.version,
        }),
    })
  }

  const withObservedIssue = (
    model: typeof Model.Type,
    issue: typeof Issue.Type,
  ) =>
    modifyFields(model, {
      workspaceAsyncData: AsyncData.map(snapshot =>
        modifyFields(snapshot, {
          issues: Array.map(current =>
            current.id === issue.id ? issue : current,
          ),
        }),
      ),
    })

  test('retains a teammate comment between an optimistic move and its rollback', () => {
    const initial = loadedBoard()
    const board = boardInstance(initial)
    const issue = issueOf(initial, 'issue-103')
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

    const childMessage = (message: typeof DragAndDropBlock.Message.Type) =>
      toParentMessage(
        IssueBoardBinding,
        board.projectId,
        toParentMessage(DragAndDropBinding, message),
      )

    story(
      update,
      given(initial),
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
      DragAndDrop.test.resolveKeyboardMove({
        binding: DragAndDropBinding,
        itemId,
        targetContainerId: containerId('Done'),
        targetIndex: 0,
      }),
      message(childMessage(DragAndDropBlock.Message.ConfirmedKeyboardDrop())),
      DragAndDrop.test.settleFocus({ binding: DragAndDropBinding, itemId }),
      model(model => {
        expect(issueOf(model, issue.id).status).toBe('Done')

        expect(boardInstance(model).model.announcement).toBe(
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
      message(Message.SucceededAppendActivity({ issue: commentedIssue })),
      model(model => {
        expect(issueOf(model, issue.id).status).toBe('Done')
        expect(issueOf(model, issue.id).comments).toContainEqual(
          teammateComment,
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
      model(model => {
        expect(issueOf(model, issue.id).status).toBe(issue.status)
        expect(issueOf(model, issue.id).comments).toContainEqual(
          teammateComment,
        )

        expect(boardInstance(model).model.announcement).toBe(
          'Could not save the move. Issue position restored.',
        )
      }),
    )
  })

  test('restores the original same-column placement and preserves a concurrent comment', () => {
    const initial = loadedBoard()
    const issue = issueOf(initial, 'issue-103')
    const moving = pendingMoveModel(initial, issue.id, issue.status, 1)
    const commentedIssue = modifyFields(issue, {
      comments: Array.append({
        id: 'comment-review',
        authorId: 'maya',
        body: 'Keep this comment when the move fails.',
        createdAt: '2026-10-22T12:00:00.000Z',
      }),
    })

    expect(issueIds(moving)).not.toEqual(issueIds(initial))

    story(
      update,
      given(withObservedIssue(moving, commentedIssue)),
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
        expect(issueIds(model)).toEqual(issueIds(initial))
        expect(issueOf(model, issue.id)).toEqual(commentedIssue)
        expect(IssueMoveState.guards.FailedMove(model.issueMoveState)).toBe(
          true,
        )
      }),
      Command.expectNone(),
    )
  })

  test('preserves concurrent issue edits and unrelated rows when restoring the original global position', () => {
    const initial = loadedBoard()
    const issue = issueOf(initial, 'issue-103')
    const unrelatedIssue = issueOf(initial, 'issue-101')
    const moving = pendingMoveModel(initial, issue.id, 'Done', 0)
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

    expect(issueOf(moving, issue.id).status).toBe('Done')

    story(
      update,
      given(
        withObservedIssue(
          withObservedIssue(moving, editedIssue),
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
        expect(issueIds(model)).toEqual(issueIds(initial))
        expect(issueOf(model, issue.id)).toEqual(editedIssue)
        expect(issueOf(model, unrelatedIssue.id)).toEqual(
          commentedUnrelatedIssue,
        )
      }),
      Command.expectNone(),
    )
  })

  test('restores placement before applying the canonical issue from a conflict result', () => {
    const initial = loadedBoard()
    const issue = issueOf(initial, 'issue-103')
    const moving = pendingMoveModel(initial, issue.id, 'Done', 0)
    const latestIssue = modifyFields(issue, {
      title: () => 'A newer canonical title',
      status: () => 'InProgress',
      version: Number.increment,
    })

    story(
      update,
      given(moving),
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
        expect(issueIds(model)).toEqual(issueIds(initial))
        expect(issueOf(model, issue.id)).toEqual(latestIssue)
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
  })
})

describe('when refreshing the workspace with an unsaved issue draft', () => {
  test('keeps the canonical issue and editable draft after a failed refresh', () => {
    const initial = loadedModel(issueRouter({ issueId: issueA.id }))
    const title = 'Keep this draft while refreshing'
    const error = 'The workspace is temporarily unavailable.'

    story(
      update,
      given(initial),
      message(
        detailMessage(
          initial,
          IssueDetailBlock.Message.UpdatedTitle({ value: title }),
        ),
      ),
      message(Message.ClickedRetryLoad()),
      Command.expectExact(LoadWorkspace()),
      model(model => {
        expect(model.workspaceAsyncData._tag).toBe('Refreshing')
        expect(snapshotOf(model).issues).toContainEqual(issueA)

        expect(detailInstance(model).model.draft.title).toBe(title)
      }),
      Command.resolve(LoadWorkspace, Message.FailedLoadWorkspace({ error })),
      model(model => {
        expect(model.workspaceAsyncData._tag).toBe('Stale')
        expect(AsyncData.getError(model.workspaceAsyncData)).toEqual(
          Option.some(error),
        )
        expect(snapshotOf(model).issues).toContainEqual(issueA)

        expect(detailInstance(model).model.draft.title).toBe(title)
        expect(detailInstance(model).model.maybeIncomingRevision).toEqual(
          Option.none(),
        )
      }),
      Command.expectNone(),
    )
  })

  test('publishes the refreshed issue and offers its revision without replacing the draft', () => {
    const initial = loadedModel(issueRouter({ issueId: issueA.id }))
    const title = 'Keep this unsaved title'
    const latestIssue = modifyFields(issueA, {
      title: () => 'A newer title loaded from the repository',
      version: version => version + 1,
    })
    const latestSnapshot = modifyFields(initialSnapshot, {
      issues: Array.map(issue =>
        issue.id === latestIssue.id ? latestIssue : issue,
      ),
    })

    story(
      update,
      given(initial),
      message(
        detailMessage(
          initial,
          IssueDetailBlock.Message.UpdatedTitle({ value: title }),
        ),
      ),
      message(Message.ClickedRetryLoad()),
      Command.expectExact(LoadWorkspace()),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ snapshot: latestSnapshot }),
      ),
      model(model => {
        expect(model.workspaceAsyncData._tag).toBe('Success')
        expect(snapshotOf(model).issues).toContainEqual(latestIssue)

        expect(detailInstance(model).model.draft.title).toBe(title)
        expect(detailInstance(model).model.maybeIncomingRevision).toEqual(
          Option.some(revisionFromIssue(latestIssue)),
        )
      }),
      Command.expectNone(),
    )
  })
})
