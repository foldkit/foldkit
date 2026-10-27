import { Array, Option, Record } from 'effect'
import {
  Command,
  Mount,
  Subscription,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import * as Url from 'foldkit/url'
import { describe, expect as expectValue, test } from 'vitest'

import { Listbox } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import {
  AppendActivity,
  LoadWorkspace,
  NavigateInternal,
  SimulateSaveFailure,
} from './command'
import { IssueDetailBinding } from './composition'
import {
  Comment,
  IssueFilters,
  SavedView,
  initialWorkspace,
  savedIssueFromIssue,
} from './domain'
import { init } from './init'
import { IssueDetailBlock } from './issueDetail'
import { SaveIssue } from './issueDetail/command'
import { issueHref } from './issueLinks'
import { WorkspaceListboxBlock } from './listbox'
import { Message } from './message'
import { ProjectSettingsBlock } from './projectSettings'
import { SaveProject } from './projectSettings/command'
import { RepositoryError } from './repository'
import { issuesRouter, savedViewRouter } from './route'
import { appliedIssueFilters } from './selection'
import { update } from './update'
import { view } from './view'

const firstIssue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issuePath = issuesRouter({ issueId: firstIssue.id })

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const loadedModel = (path = '/') => {
  const applicationInit = init(url(path))

  const workspaceLoad = update(
    applicationInit.model,
    Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
  )

  return workspaceLoad.model
}

describe('workspace application', () => {
  test('marks the current workspace and project navigation links', () => {
    scene(
      { update, view },
      given(loadedModel('/projects/platform/board')),
      expect(role('navigation', { name: 'Project navigation' })).toExist(),
      expect(role('link', { name: 'Board' })).toHaveAttr(
        'aria-current',
        'page',
      ),
      expect(role('link', { name: 'Issues' })).not.toHaveAttr('aria-current'),
    )

    scene(
      { update, view },
      given(loadedModel('/people')),
      expect(role('navigation', { name: 'Workspace navigation' })).toExist(),
      expect(role('link', { name: 'People' })).toHaveAttr(
        'aria-current',
        'page',
      ),
      expect(role('link', { name: 'All issues' })).not.toHaveAttr(
        'aria-current',
      ),
    )
  })

  test('does not render a retained issue editor after its route is hidden', () => {
    const issueOpenModel = loadedModel(issuePath)
    const issueClose = update(
      issueOpenModel,
      Message.ChangedUrl({ url: url('/people') }),
    ).model

    expectValue(Record.values(issueClose.issueDetails)).toHaveLength(1)

    scene(
      { update, view },
      given(issueClose),
      expect(role('heading', { name: 'People' })).toExist(),
      expect(label('Issue title')).not.toExist(),
      expect(role('button', { name: 'Close issue' })).not.toExist(),
    )
  })

  test('selects the active member through its Listbox before requesting activity', () => {
    scene(
      { update, view },
      given(loadedModel('/settings')),
      click(role('button', { name: 'Active member' })),
      Command.resolve(
        Listbox.test.FocusListboxItems,
        WorkspaceListboxBlock.Message.CompletedFocusListboxItems(),
      ),
      Mount.resolve(
        Listbox.test.AnchorListbox,
        WorkspaceListboxBlock.Message.CompletedAnchorListbox(),
      ),
      Mount.resolve(
        Listbox.test.PortalListboxBackdrop,
        WorkspaceListboxBlock.Message.CompletedPortalListboxBackdrop(),
      ),
      click(role('option', { name: 'Jordan Lee' })),
      Command.resolve(
        Listbox.test.FocusListboxButton,
        WorkspaceListboxBlock.Message.CompletedFocusListboxButton(),
      ),
      Mount.expectEnded(
        Listbox.test.AnchorListbox,
        Listbox.test.PortalListboxBackdrop,
      ),
      expect(role('button', { name: 'Active member' })).toHaveText(
        'Jordan Lee',
      ),
      click(role('button', { name: 'Simulate activity' })),
      Command.expectExact(
        AppendActivity({
          issueId: 'issue-104',
          authorId: 'maya',
          body: 'I checked the latest changes. This is ready for another look.',
        }),
      ),
      Command.resolve(
        AppendActivity,
        Message.FailedAppendActivity({ error: 'Activity is unavailable.' }),
      ),
    )
  })

  test('a conflict updates shared data and lets the editor reload before saving again', () => {
    const latestIssue = modifyFields(firstIssue, {
      title: () => 'Saved by a teammate',
      comments: Array.append(
        Comment.make({
          id: 'comment-during-conflict',
          authorId: 'alex',
          body: 'The conversation stays current while you edit.',
          createdAt: '2026-10-24T12:30:00.000Z',
        }),
      ),
      version: version => version + 1,
    })
    const savedIssueSnapshot = modifyFields(latestIssue, {
      title: () => 'Revised after reloading',
      version: version => version + 1,
    })
    const pendingSave = SaveIssue({
      issueId: firstIssue.id,
      expectedVersion: firstIssue.version,
      draft: {
        title: 'Keep this local draft',
        description: firstIssue.description,
        status: firstIssue.status,
        priority: firstIssue.priority,
        projectId: firstIssue.projectId,
        maybeAssigneeId: firstIssue.maybeAssigneeId,
        labelIds: firstIssue.labelIds,
      },
    })

    scene(
      { update, view, subscriptions: ApplicationBlock.subscriptions },
      given(loadedModel(issuePath)),
      type(label('Issue title'), 'Keep this local draft'),
      click(role('button', { name: 'Save changes' })),
      Command.keepPending(pendingSave),
      Subscription.emit(
        ApplicationBlock.subscriptions.activity,
        Message.TickedActivityStream(),
      ),
      Command.expectExact(
        pendingSave,
        AppendActivity({
          issueId: firstIssue.id,
          authorId: 'alex',
          body: 'I checked the latest changes. This is ready for another look.',
        }),
      ),
      Command.resolve(
        AppendActivity,
        Message.SucceededAppendActivity({
          issueId: latestIssue.id,
          comment: Option.getOrThrow(Array.last(latestIssue.comments)),
        }),
      ),
      expect(text('The conversation stays current while you edit.')).toExist(),
      Command.resolve(
        pendingSave,
        IssueDetailBlock.Message.FailedSaveIssue({
          issueId: firstIssue.id,
          expectedVersion: firstIssue.version,
          error: RepositoryError.Conflict({
            issueId: firstIssue.id,
            expectedVersion: firstIssue.version,
            actualVersion: latestIssue.version,
            latestIssue,
            message: 'A newer revision is available.',
          }),
        }),
      ),
      expect(label('Issue title')).toHaveValue('Keep this local draft'),
      expect(
        role('link', {
          name: `${latestIssue.identifier} ${latestIssue.title}`,
        }),
      ).toExist(),
      expect(role('alert')).toContainText('Your draft is preserved'),
      click(role('button', { name: 'Reload issue' })),
      expect(label('Issue title')).toHaveValue(latestIssue.title),
      type(label('Issue title'), savedIssueSnapshot.title),
      click(role('button', { name: 'Save changes' })),
      Command.expectExact(
        SaveIssue({
          issueId: firstIssue.id,
          expectedVersion: latestIssue.version,
          draft: {
            title: savedIssueSnapshot.title,
            description: savedIssueSnapshot.description,
            status: savedIssueSnapshot.status,
            priority: savedIssueSnapshot.priority,
            projectId: savedIssueSnapshot.projectId,
            maybeAssigneeId: savedIssueSnapshot.maybeAssigneeId,
            labelIds: savedIssueSnapshot.labelIds,
          },
        }),
      ),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          expectedVersion: latestIssue.version,
        }),
      ),
      expect(label('Issue title')).toHaveValue(savedIssueSnapshot.title),
    )
  })

  test('renders the loading and loaded workspace states', () => {
    const applicationInit = init(url('/'))

    scene(
      { update, view },
      given(applicationInit.model),
      expect(text('Loading workspace…')).toExist(),
    )

    scene(
      { update, view },
      given(loadedModel()),
      expect(role('heading', { name: 'All issues' })).toExist(),
      expect(text('16 issues')).toExist(),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
    )
  })

  test('preserves saved filters in an issue panel without saved view metadata', () => {
    const filters = IssueFilters.make({
      query: 'command',
      maybeStatus: Option.none(),
      sort: 'Identifier',
      groupBy: 'None',
    })
    const savedView = SavedView.make({
      id: 'view-command-work',
      name: 'Command work',
      filters,
    })
    const modelWithPreset = modifyFields(loadedModel(), {
      savedViews: () => [savedView],
    })

    const savedViewModel = update(
      modelWithPreset,
      Message.ChangedUrl({ url: url(`/views/${savedView.id}`) }),
    ).model

    const savedViewPath = savedViewRouter({
      viewId: savedView.id,
      filters,
    })
    const href = issueHref(savedViewModel, firstIssue.id)

    expectValue(href).toBe(
      savedViewRouter({
        viewId: savedView.id,
        filters,
        issueId: firstIssue.id,
      }),
    )

    const reloadedIssueModel = loadedModel(href)

    expectValue(reloadedIssueModel.savedViews).toEqual([])
    expectValue(appliedIssueFilters(reloadedIssueModel)).toEqual(filters)

    scene(
      { update, view },
      given(reloadedIssueModel),
      click(role('button', { name: 'Close issue' })),
      Command.expectExact(NavigateInternal({ url: savedViewPath })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )

    scene(
      { update, view },
      given(loadedModel(savedViewPath)),
      expect(role('heading', { name: 'Filtered issues' })).toExist(),
      expect(label('Search issues')).toHaveValue('command'),
      expect(text('1 issue')).toExist(),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      expect(text('Keep issue drafts when switching projects')).not.toExist(),
    )
  })

  test('updates the canonical issue and its list row after saving a draft', () => {
    const savedIssueSnapshot = modifyFields(firstIssue, {
      title: () => 'Find every project from one command menu',
      version: version => version + 1,
    })

    scene(
      { update, view },
      given(loadedModel(issuePath)),
      type(label('Issue title'), savedIssueSnapshot.title),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      click(role('button', { name: 'Save changes' })),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          expectedVersion: firstIssue.version,
        }),
      ),
      expect(
        role('link', {
          name: `${savedIssueSnapshot.identifier} ${savedIssueSnapshot.title}`,
        }),
      ).toExist(),
      expect(label('Issue title')).toHaveValue(savedIssueSnapshot.title),
      expect(text(`${savedIssueSnapshot.identifier} saved`)).toExist(),
    )
  })

  test('retains the draft after failure and updates the list after a successful retry', () => {
    const savedIssueSnapshot = modifyFields(firstIssue, {
      title: () => 'Keep the issue draft when a save fails',
      description: () => 'Retry the current draft after the service recovers.',
      version: version => version + 1,
    })

    scene(
      { update, view },
      given(loadedModel('/settings')),
      click(role('button', { name: 'Fail next save' })),
      Command.resolve(
        SimulateSaveFailure,
        Message.CompletedSimulateSaveFailure(),
      ),
    )
    const issueClose = update(
      loadedModel('/settings'),
      Message.ChangedUrl({ url: url('/') }),
    )
    const issueOpen = update(
      issueClose.model,
      Message.ChangedUrl({ url: url(issuePath) }),
    )

    scene(
      { update, view },
      given(issueOpen.model),
      type(label('Issue title'), savedIssueSnapshot.title),
      type(label('Description'), savedIssueSnapshot.description),
      click(role('button', { name: 'Save changes' })),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.FailedSaveIssue({
          issueId: firstIssue.id,
          expectedVersion: firstIssue.version,
          error: RepositoryError.Unavailable({
            message: 'The workspace is temporarily unavailable.',
            operation: 'Save',
          }),
        }),
      ),
      expect(role('alert')).toContainText(
        'The workspace is temporarily unavailable.',
      ),
      expect(label('Issue title')).toHaveValue(savedIssueSnapshot.title),
      expect(label('Description')).toHaveValue(savedIssueSnapshot.description),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      click(role('button', { name: 'Retry save' })),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          expectedVersion: firstIssue.version,
        }),
      ),
      expect(role('alert')).not.toExist(),
      expect(
        role('link', {
          name: `${savedIssueSnapshot.identifier} ${savedIssueSnapshot.title}`,
        }),
      ).toExist(),
    )
  })

  test('announces a failed load and renders the workspace after retrying', () => {
    const applicationInit = init(url('/'))

    const workspaceLoadFailure = update(
      applicationInit.model,
      Message.FailedLoadWorkspace({
        error: 'The workspace is temporarily unavailable.',
      }),
    )

    scene(
      { update, view },
      given(workspaceLoadFailure.model),
      expect(role('alert')).toContainText(
        'The workspace is temporarily unavailable.',
      ),
      expect(role('heading', { name: 'Unable to load workspace' })).toExist(),
      click(role('button', { name: 'Retry loading' })),
      Command.expectExact(LoadWorkspace()),
      expect(text('Loading workspace…')).toExist(),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      expect(role('alert')).not.toExist(),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
    )
  })

  test('preserves project fields after failure and publishes the retried save', () => {
    const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
    const savedProject = modifyFields(project, {
      name: () => 'Platform engineering',
      description: () => 'Reliable foundations for every team.',
    })
    const error = 'The project service is temporarily unavailable.'

    scene(
      { update, view },
      given(loadedModel(`/projects/${project.id}/settings`)),
      expect(role('button', { name: 'Save changes' })).toBeDisabled(),
      type(label('Project name'), '   '),
      expect(role('button', { name: 'Save changes' })).toBeDisabled(),
      type(label('Project name'), savedProject.name),
      type(label('Project description'), savedProject.description),
      expect(role('button', { name: 'Save changes' })).toBeEnabled(),
      click(role('button', { name: 'Save changes' })),
      expect(role('button', { name: 'Saving…' })).toBeDisabled(),
      Command.expectExact(SaveProject({ project: savedProject })),
      Command.resolve(
        SaveProject,
        ProjectSettingsBlock.Message.FailedSaveProject({ error }),
      ),
      expect(role('alert')).toContainText(error),
      expect(label('Project name')).toHaveValue(savedProject.name),
      expect(label('Project description')).toHaveValue(
        savedProject.description,
      ),
      expect(role('heading', { name: project.name })).toExist(),
      click(role('button', { name: 'Retry changes' })),
      Command.expectExact(SaveProject({ project: savedProject })),
      Command.resolve(
        SaveProject,
        ProjectSettingsBlock.Message.SucceededSaveProject({
          project: savedProject,
        }),
      ),
      expect(role('alert')).not.toExist(),
      expect(role('heading', { name: savedProject.name })).toExist(),
      expect(role('link', { name: savedProject.name })).toExist(),
      expect(text('Project saved')).toExist(),
      expect(role('button', { name: 'Save changes' })).toBeDisabled(),
    )
  })

  test('announces failed activity and clears the error after a successful retry', () => {
    const activityIssue = Option.getOrThrow(
      Array.findFirst(
        initialWorkspace.issues,
        issue => issue.id === 'issue-105',
      ),
    )
    const body = 'A teammate checked the keyboard navigation.'
    const commentedIssue = modifyFields(activityIssue, {
      comments: Array.append({
        id: 'activity-comment',
        authorId: 'alex',
        body,
        createdAt: '2026-10-22T12:00:00.000Z',
      }),
    })
    const error = 'Activity could not be added.'

    scene(
      { update, view },
      given(loadedModel('/settings')),
      click(role('button', { name: 'Simulate activity' })),
      Command.expectExact(
        AppendActivity({
          issueId: firstIssue.id,
          authorId: 'alex',
          body: 'I checked the latest changes. This is ready for another look.',
        }),
      ),
      Command.resolve(AppendActivity, Message.FailedAppendActivity({ error })),
      expect(role('alert')).toContainText(error),
      expect(text('1 activity events requested')).toExist(),
      click(role('button', { name: 'Simulate activity' })),
      Command.expectExact(
        AppendActivity({
          issueId: activityIssue.id,
          authorId: 'alex',
          body: 'The next iteration is ready. Let me know what you think.',
        }),
      ),
      Command.resolve(
        AppendActivity,
        Message.SucceededAppendActivity({
          issueId: commentedIssue.id,
          comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
        }),
      ),
      expect(text(error)).not.toExist(),
      expect(text('2 activity events requested')).toExist(),
    )
  })

  test('keeps the routed editor and its draft visible during a failed refresh', () => {
    const titleUpdate = update(
      loadedModel(issuePath),
      toParentMessage(
        IssueDetailBinding,
        firstIssue.id,
        IssueDetailBlock.Message.UpdatedTitle({
          value: 'Keep this draft while refreshing',
        }),
      ),
    )

    const workspaceReload = update(
      titleUpdate.model,
      Message.ClickedRetryLoad(),
    )

    scene(
      { update, view },
      given(workspaceReload.model),
      expect(label('Issue title')).toHaveValue(
        'Keep this draft while refreshing',
      ),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      expect(text('Loading workspace…')).not.toExist(),
    )

    const workspaceRefreshFailure = update(
      workspaceReload.model,
      Message.FailedLoadWorkspace({
        error: 'The workspace is temporarily unavailable.',
      }),
    )

    scene(
      { update, view },
      given(workspaceRefreshFailure.model),
      expect(label('Issue title')).toHaveValue(
        'Keep this draft while refreshing',
      ),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      expect(role('button', { name: 'Close issue' })).toExist(),
      expect(text('Unable to load workspace')).not.toExist(),
    )
  })

  test('keeps a dirty editor draft and offers the latest revision after a successful refresh', () => {
    const latestIssue = modifyFields(firstIssue, {
      title: () => 'A newer title loaded from the repository',
      version: version => version + 1,
    })
    const latestWorkspace = modifyFields(initialWorkspace, {
      issues: Array.map(issue =>
        issue.id === latestIssue.id ? latestIssue : issue,
      ),
    })

    const titleUpdate = update(
      loadedModel(issuePath),
      toParentMessage(
        IssueDetailBinding,
        firstIssue.id,
        IssueDetailBlock.Message.UpdatedTitle({
          value: 'Keep this unsaved title',
        }),
      ),
    )

    const workspaceReload = update(
      titleUpdate.model,
      Message.ClickedRetryLoad(),
    )
    const workspaceRefresh = update(
      workspaceReload.model,
      Message.SucceededLoadWorkspace({ workspace: latestWorkspace }),
    )

    scene(
      { update, view },
      given(workspaceRefresh.model),
      expect(label('Issue title')).toHaveValue('Keep this unsaved title'),
      expect(
        role('link', {
          name: `${latestIssue.identifier} ${latestIssue.title}`,
        }),
      ).toExist(),
      expect(role('alert')).toContainText('Your draft is preserved'),
      click(role('button', { name: 'Reload issue' })),
      expect(label('Issue title')).toHaveValue(latestIssue.title),
      expect(role('alert')).not.toExist(),
    )
  })
})
