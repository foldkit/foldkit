import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
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
import { ApplicationComposition } from './composition'
import { Comment, IssueFilters, SavedView, initialSnapshot } from './domain'
import { init } from './init'
import { IssueDetailBlock } from './issueDetail'
import { SaveIssue } from './issueDetail/command'
import { WorkspaceListboxBlock } from './listbox'
import { Message } from './message'
import { type Model, appliedIssueFilters } from './model'
import { issueHref } from './navigation'
import { ProjectSettingsBlock } from './projectSettings'
import { SaveProject } from './projectSettings/command'
import { RepositoryError } from './repository'
import { issueRouter, savedViewRouter } from './route'
import { update } from './update'
import { view } from './view'

const firstIssue = Option.getOrThrow(Array.head(initialSnapshot.issues))
const issueUrl = issueRouter({ issueId: firstIssue.id })

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

const captureUpdates = () => {
  const models = Array.empty<typeof Model.Type>()

  return {
    update: (
      model: typeof Model.Type,
      message: typeof ApplicationComposition.Message.Type,
    ) => {
      const messageUpdate = update(model, message)

      models.push(messageUpdate.model)

      return messageUpdate
    },
    latestModel: () => Option.getOrThrow(Array.last(models)),
  }
}

const canonicalIssue = (model: typeof Model.Type, issueId = firstIssue.id) =>
  Option.getOrThrow(
    Option.match(AsyncData.getData(model.workspaceAsyncData), {
      onNone: () => Option.none(),
      onSome: snapshot =>
        Array.findFirst(snapshot.issues, issue => issue.id === issueId),
    }),
  )

describe('workspace application', () => {
  test('does not render a retained issue editor after its route is hidden', () => {
    const issueModel = loadedModel(issueUrl)
    const hiddenIssue = update(
      issueModel,
      Message.ChangedUrl({ url: url('/people') }),
    ).model

    expectValue(hiddenIssue.issueDetailInstances).toHaveLength(1)

    scene(
      { update, view },
      given(hiddenIssue),
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
    const savedIssue = modifyFields(latestIssue, {
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
      given(loadedModel(issueUrl)),
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
        Message.SucceededAppendActivity({ issue: latestIssue }),
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
      type(label('Issue title'), savedIssue.title),
      click(role('button', { name: 'Save changes' })),
      Command.expectExact(
        SaveIssue({
          issueId: firstIssue.id,
          expectedVersion: latestIssue.version,
          draft: {
            title: savedIssue.title,
            description: savedIssue.description,
            status: savedIssue.status,
            priority: savedIssue.priority,
            projectId: savedIssue.projectId,
            maybeAssigneeId: savedIssue.maybeAssigneeId,
            labelIds: savedIssue.labelIds,
          },
        }),
      ),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: latestIssue.version,
        }),
      ),
      expect(label('Issue title')).toHaveValue(savedIssue.title),
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

  test('preserves saved filters in an issue return URL without saved view metadata', () => {
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

    const barePresetRoute = update(
      modelWithPreset,
      Message.ChangedUrl({ url: url(`/views/${savedView.id}`) }),
    ).model

    const returnTarget = savedViewRouter({
      viewId: savedView.id,
      filters,
    })
    const href = issueHref(barePresetRoute, firstIssue.id)

    expectValue(href).toBe(
      issueRouter({ issueId: firstIssue.id, returnTo: returnTarget }),
    )

    const freshIssueModel = loadedModel(href)
    const captured = captureUpdates()

    expectValue(freshIssueModel.savedViews).toEqual([])
    expectValue(appliedIssueFilters(freshIssueModel)).toEqual(filters)

    scene(
      { update: captured.update, view },
      given(freshIssueModel),
      click(role('button', { name: 'Close issue' })),
      Command.expectExact(NavigateInternal({ url: returnTarget })),
      Command.resolve(NavigateInternal, Message.CompletedNavigateInternal()),
    )

    const returned = update(
      captured.latestModel(),
      Message.ChangedUrl({ url: url(returnTarget) }),
    )

    expectValue(appliedIssueFilters(returned.model)).toEqual(filters)

    scene(
      { update, view },
      given(returned.model),
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
    const savedIssue = modifyFields(firstIssue, {
      title: () => 'Find every project from one command menu',
      version: version => version + 1,
    })

    scene(
      { update, view },
      given(loadedModel(issueUrl)),
      type(label('Issue title'), savedIssue.title),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      click(role('button', { name: 'Save changes' })),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: firstIssue.version,
        }),
      ),
      expect(
        role('link', {
          name: `${savedIssue.identifier} ${savedIssue.title}`,
        }),
      ).toExist(),
      expect(label('Issue title')).toHaveValue(savedIssue.title),
      expect(text(`${savedIssue.identifier} saved`)).toExist(),
    )
  })

  test('retains the draft after failure and updates the list after a successful retry', () => {
    const savedIssue = modifyFields(firstIssue, {
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
    const returnToIssues = update(
      loadedModel('/settings'),
      Message.ChangedUrl({ url: url('/') }),
    )
    const routeChange = update(
      returnToIssues.model,
      Message.ChangedUrl({ url: url(issueUrl) }),
    )

    scene(
      { update, view },
      given(routeChange.model),
      type(label('Issue title'), savedIssue.title),
      type(label('Description'), savedIssue.description),
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
      expect(label('Issue title')).toHaveValue(savedIssue.title),
      expect(label('Description')).toHaveValue(savedIssue.description),
      expect(
        role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
      click(role('button', { name: 'Retry save' })),
      Command.resolve(
        SaveIssue,
        IssueDetailBlock.Message.SucceededSaveIssue({
          issue: savedIssue,
          expectedVersion: firstIssue.version,
        }),
      ),
      expect(role('alert')).not.toExist(),
      expect(
        role('link', {
          name: `${savedIssue.identifier} ${savedIssue.title}`,
        }),
      ).toExist(),
    )
  })

  test('announces a failed load and renders the workspace after retrying', () => {
    const applicationInit = init(url('/'))

    const workspaceFailure = update(
      applicationInit.model,
      Message.FailedLoadWorkspace({
        error: 'The workspace is temporarily unavailable.',
      }),
    )

    scene(
      { update, view },
      given(workspaceFailure.model),
      expect(role('alert')).toContainText(
        'The workspace is temporarily unavailable.',
      ),
      expect(role('heading', { name: 'Unable to load workspace' })).toExist(),
      click(role('button', { name: 'Retry loading' })),
      Command.expectExact(LoadWorkspace()),
      expect(text('Loading workspace…')).toExist(),
      Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ snapshot: initialSnapshot }),
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
    const project = Option.getOrThrow(Array.head(initialSnapshot.projects))
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

  test('announces failed activity and shows a later update in canonical issue comments', () => {
    const captured = captureUpdates()
    const nextIssue = Option.getOrThrow(
      Array.findFirst(
        initialSnapshot.issues,
        issue => issue.id === 'issue-105',
      ),
    )
    const body = 'A teammate checked the keyboard navigation.'
    const commentedIssue = modifyFields(nextIssue, {
      comments: Array.append({
        id: 'activity-comment',
        authorId: 'alex',
        body,
        createdAt: '2026-10-22T12:00:00.000Z',
      }),
    })
    const error = 'Activity could not be added.'

    scene(
      { update: captured.update, view },
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
          issueId: nextIssue.id,
          authorId: 'alex',
          body: 'The next iteration is ready. Let me know what you think.',
        }),
      ),
      Command.resolve(
        AppendActivity,
        Message.SucceededAppendActivity({ issue: commentedIssue }),
      ),
      expect(text(error)).not.toExist(),
      expect(text('2 activity events requested')).toExist(),
    )

    expectValue(canonicalIssue(captured.latestModel(), nextIssue.id)).toEqual(
      commentedIssue,
    )

    const routedIssue = update(
      captured.latestModel(),
      Message.ChangedUrl({ url: url(issueRouter({ issueId: nextIssue.id })) }),
    )

    scene(
      { update, view },
      given(routedIssue.model),
      expect(label('Issue title')).toHaveValue(nextIssue.title),
      expect(text(body)).toExist(),
      expect(role('heading', { name: 'Activity' })).toExist(),
    )
  })

  test('keeps the routed editor and its draft visible during a failed refresh', () => {
    const captured = captureUpdates()

    scene(
      { update: captured.update, view },
      given(loadedModel(issueUrl)),
      type(label('Issue title'), 'Keep this draft while refreshing'),
      expect(label('Issue title')).toHaveValue(
        'Keep this draft while refreshing',
      ),
    )

    const reload = update(captured.latestModel(), Message.ClickedRetryLoad())

    scene(
      { update, view },
      given(reload.model),
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

    const failedRefresh = update(
      reload.model,
      Message.FailedLoadWorkspace({
        error: 'The workspace is temporarily unavailable.',
      }),
    )

    scene(
      { update, view },
      given(failedRefresh.model),
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

    expectValue(canonicalIssue(failedRefresh.model)).toEqual(firstIssue)
  })

  test('keeps a dirty editor draft and offers the latest revision after a successful refresh', () => {
    const captured = captureUpdates()
    const latestIssue = modifyFields(firstIssue, {
      title: () => 'A newer title loaded from the repository',
      version: version => version + 1,
    })
    const latestSnapshot = modifyFields(initialSnapshot, {
      issues: Array.map(issue =>
        issue.id === latestIssue.id ? latestIssue : issue,
      ),
    })

    scene(
      { update: captured.update, view },
      given(loadedModel(issueUrl)),
      type(label('Issue title'), 'Keep this unsaved title'),
      expect(label('Issue title')).toHaveValue('Keep this unsaved title'),
    )

    const reload = update(captured.latestModel(), Message.ClickedRetryLoad())
    const refreshed = update(
      reload.model,
      Message.SucceededLoadWorkspace({ snapshot: latestSnapshot }),
    )

    expectValue(canonicalIssue(refreshed.model)).toEqual(latestIssue)

    scene(
      { update, view },
      given(refreshed.model),
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
