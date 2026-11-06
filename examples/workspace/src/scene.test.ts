import { Array, Effect, Option } from 'effect'
import { AsyncData, Scene, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import * as Url from 'foldkit/url'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Listbox } from '@foldkit/ui'

import { IssueDetailBlock } from './blocks/issueDetail'
import { SaveIssue } from './blocks/issueDetail/command'
import { ProjectSettingsBlock } from './blocks/projectSettings'
import { SaveProject } from './blocks/projectSettings/command'
import {
  AddIssueComment,
  FailNextIssueSave,
  LoadWorkspace,
  NavigateInternal,
} from './command'
import { IssueDetailsBinding } from './composition'
import { Issue, Workspace, initialWorkspace } from './domain'
import { ApplicationBlock, layer } from './index'
import { StringListboxBlock } from './listbox'
import { Message } from './message'
import { RepositoryError } from './repository'
import { issuesRouter, savedViewRouter } from './route'
import { subscriptions } from './subscription'

const application = { block: ApplicationBlock, layer }

const firstIssue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issuePath = issuesRouter({ issueId: firstIssue.id })

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

describe('workspace application', () => {
  it.effect('marks the current workspace and project navigation links', () => {
    return Scene.scene(
      {
        ...application,
        routing: {
          onUrlChange: url => Message.ChangedUrl({ url }),
          origin: 'https://workspace.test',
        },
      },
      Scene.init(url('/projects/platform/board')),
      Scene.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Scene.expect(
        Scene.role('navigation', { name: 'Project navigation' }),
      ).toExist(),
      Scene.expect(Scene.role('link', { name: 'Board' })).toHaveAttr(
        'aria-current',
        'page',
      ),
      Scene.expect(Scene.role('link', { name: 'Issues' })).not.toHaveAttr(
        'aria-current',
      ),
      Scene.Navigation.changedUrl('/people'),
      Scene.expect(
        Scene.role('navigation', { name: 'Workspace navigation' }),
      ).toExist(),
      Scene.expect(Scene.role('link', { name: 'People' })).toHaveAttr(
        'aria-current',
        'page',
      ),
      Scene.expect(Scene.role('link', { name: 'All issues' })).not.toHaveAttr(
        'aria-current',
      ),
    )
  })

  it.effect(
    'does not render a retained issue editor after its route is hidden',
    () =>
      Scene.scene(
        {
          block: ApplicationBlock,
          layer,
          routing: {
            onUrlChange: url => Message.ChangedUrl({ url }),
            origin: 'https://workspace.test',
          },
        },
        Scene.init(url(issuePath)),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(firstIssue.title),
        Scene.expect(Scene.role('button', { name: 'Close issue' })).toExist(),
        Scene.Navigation.changedUrl('/people'),
        Scene.expect(Scene.role('heading', { name: 'People' })).toExist(),
        Scene.expect(Scene.label('Issue title')).not.toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Close issue' }),
        ).not.toExist(),
      ),
  )

  it.effect(
    'shows refreshed issue fields without updating the retained editor',
    () => {
      const refreshedIssue = modifyFields(firstIssue, {
        title: () => 'The latest shared title',
        description: () => 'A teammate updated these details.',
        status: () => 'Done',
        version: version => version + 1,
      })

      const refreshedWorkspace = modifyFields(initialWorkspace, {
        issues: Array.map(issue =>
          issue.id === refreshedIssue.id ? refreshedIssue : issue,
        ),
      })

      return Effect.gen(function* () {
        const refreshedModel = yield* Story.story(
          application,
          Story.init(url(issuePath)),
          Story.Command.resolve(
            LoadWorkspace,
            Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
          ),
          Story.message(Message.ClickedRetryLoad()),
          Story.Command.resolve(
            LoadWorkspace,
            Message.SucceededLoadWorkspace({ workspace: refreshedWorkspace }),
          ),
        )

        yield* Scene.scene(
          application,
          Scene.given(refreshedModel),
          Scene.expect(Scene.label('Issue title')).toHaveValue(
            refreshedIssue.title,
          ),
          Scene.expect(Scene.label('Description')).toHaveValue(
            refreshedIssue.description,
          ),
          Scene.expect(
            Scene.within(
              Scene.role('region', {
                name: `${refreshedIssue.identifier} details`,
              }),
              Scene.label('Status'),
            ),
          ).toHaveText('Done'),
          Scene.expect(
            Scene.role('button', { name: 'Save changes' }),
          ).toBeDisabled(),
          Scene.expect(Scene.text('All changes saved')).toExist(),
        )
      })
    },
  )

  it.effect(
    'selects the active member through its Listbox before requesting activity',
    () => {
      return Scene.scene(
        application,
        Scene.init(url('/settings')),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.click(Scene.role('button', { name: 'Active member' })),
        Scene.Command.resolve(
          Listbox.test.FocusListboxItems,
          StringListboxBlock.Message.CompletedFocusListboxItems(),
        ),
        Scene.Mount.resolve(
          Listbox.test.AnchorListbox,
          StringListboxBlock.Message.CompletedAnchorListbox(),
        ),
        Scene.Mount.resolve(
          Listbox.test.PortalListboxBackdrop,
          StringListboxBlock.Message.CompletedPortalListboxBackdrop(),
        ),
        Scene.click(Scene.role('option', { name: 'Jordan Lee' })),
        Scene.Command.resolve(
          Listbox.test.FocusListboxButton,
          StringListboxBlock.Message.CompletedFocusListboxButton(),
        ),
        Scene.Mount.expectEnded(
          Listbox.test.AnchorListbox,
          Listbox.test.PortalListboxBackdrop,
        ),
        Scene.expect(
          Scene.role('button', { name: 'Active member' }),
        ).toHaveText('Jordan Lee'),
        Scene.click(Scene.role('button', { name: 'Simulate activity' })),
        Scene.Command.expectExact(
          AddIssueComment({
            issueId: 'issue-104',
            authorId: 'maya',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Scene.Command.resolve(
          AddIssueComment,
          Message.FailedAddIssueComment({ error: 'Activity is unavailable.' }),
        ),
      )
    },
  )

  it.effect(
    'a conflict updates shared data and lets the editor reload before saving again',
    () => {
      const latestIssue = modifyFields(firstIssue, {
        title: () => 'Saved by a teammate',
        comments: Array.append(
          Issue.Comment.make({
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
      return Scene.scene(
        application,
        Scene.init(url(issuePath)),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.type(Scene.label('Issue title'), 'Keep this local draft'),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.keepPending(pendingSave),
        Scene.Subscription.expectActive(subscriptions.activity),
        Scene.Subscription.emit(
          subscriptions.activity,
          Message.TickedActivityStream(),
        ),
        Scene.Command.expectExact(
          pendingSave,
          AddIssueComment({
            issueId: firstIssue.id,
            authorId: 'alex',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Scene.Command.resolve(
          AddIssueComment,
          Message.SucceededAddIssueComment({
            issueId: latestIssue.id,
            comment: Option.getOrThrow(Array.last(latestIssue.comments)),
          }),
        ),
        Scene.expect(
          Scene.text('The conversation stays current while you edit.'),
        ).toExist(),
        Scene.Command.resolve(
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
        Scene.expect(Scene.label('Issue title')).toHaveValue(
          'Keep this local draft',
        ),
        Scene.expect(
          Scene.role('link', {
            name: `${latestIssue.identifier} ${latestIssue.title}`,
          }),
        ).toExist(),
        Scene.expect(Scene.role('alert')).toContainText(
          'Your draft is preserved',
        ),
        Scene.click(Scene.role('button', { name: 'Reload issue' })),
        Scene.expect(Scene.label('Issue title')).toHaveValue(latestIssue.title),
        Scene.type(Scene.label('Issue title'), savedIssue.title),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.expectExact(
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
        Scene.Command.resolve(
          SaveIssue,
          IssueDetailBlock.Message.SucceededSaveIssue({
            saveResult: Issue.toSaveResult(savedIssue),
            expectedVersion: latestIssue.version,
          }),
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(savedIssue.title),
      )
    },
  )

  it.effect('renders the loading and loaded workspace states', () =>
    Scene.scene(
      application,
      Scene.init(url('/')),
      Scene.expect(Scene.text('Loading workspace…')).toExist(),
      Scene.Command.resolve(
        LoadWorkspace,
        Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
      ),
      Scene.expect(Scene.role('heading', { name: 'All issues' })).toExist(),
      Scene.expect(Scene.text('16 issues')).toExist(),
      Scene.expect(
        Scene.role('link', {
          name: `${firstIssue.identifier} ${firstIssue.title}`,
        }),
      ).toExist(),
    ),
  )

  it.effect(
    'preserves saved filters in an issue panel without saved view metadata',
    () => {
      const filters = Issue.Filters.make({
        query: 'command',
        maybeStatus: Option.none(),
        sort: 'Identifier',
        groupBy: 'None',
      })
      const viewId = 'view-command-work'
      const savedViewPath = savedViewRouter({ viewId, filters })
      const savedViewIssuePath = savedViewRouter({
        viewId,
        filters,
        issueId: firstIssue.id,
      })

      return Scene.scene(
        {
          block: ApplicationBlock,
          layer,
          routing: {
            onUrlChange: url => Message.ChangedUrl({ url }),
            origin: 'https://workspace.test',
          },
        },
        Scene.init(url(savedViewIssuePath)),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(firstIssue.title),
        Scene.expect(Scene.label('Search issues')).toHaveValue('command'),
        Scene.click(Scene.role('button', { name: 'Close issue' })),
        Scene.Command.expectExact(NavigateInternal({ url: savedViewPath })),
        Scene.Command.resolve(
          NavigateInternal,
          Message.CompletedNavigateInternal(),
        ),
        Scene.Navigation.changedUrl(savedViewPath),
        Scene.expect(
          Scene.role('heading', { name: 'Filtered issues' }),
        ).toExist(),
        Scene.expect(Scene.label('Search issues')).toHaveValue('command'),
        Scene.expect(Scene.text('1 issue')).toExist(),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
        Scene.expect(
          Scene.text('Keep issue drafts when switching projects'),
        ).not.toExist(),
      )
    },
  )

  it.effect(
    'updates the canonical issue and its list row after saving a draft',
    () => {
      const savedIssue = modifyFields(firstIssue, {
        title: () => 'Find every project from one command menu',
        version: version => version + 1,
      })
      return Scene.scene(
        application,
        Scene.init(url(issuePath)),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.type(Scene.label('Issue title'), savedIssue.title),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.resolve(
          SaveIssue,
          IssueDetailBlock.Message.SucceededSaveIssue({
            saveResult: Issue.toSaveResult(savedIssue),
            expectedVersion: firstIssue.version,
          }),
        ),
        Scene.expect(
          Scene.role('link', {
            name: `${savedIssue.identifier} ${savedIssue.title}`,
          }),
        ).toExist(),
        Scene.expect(Scene.label('Issue title')).toHaveValue(savedIssue.title),
        Scene.expect(Scene.text(`${savedIssue.identifier} saved`)).toExist(),
      )
    },
  )

  it.effect(
    'retains the draft after failure and updates the list after a successful retry',
    () => {
      const savedIssue = modifyFields(firstIssue, {
        title: () => 'Keep the issue draft when a save fails',
        description: () =>
          'Retry the current draft after the service recovers.',
        version: version => version + 1,
      })
      return Scene.scene(
        {
          block: ApplicationBlock,
          layer,
          routing: {
            onUrlChange: url => Message.ChangedUrl({ url }),
            origin: 'https://workspace.test',
          },
        },
        Scene.init(url('/settings')),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.click(Scene.role('button', { name: 'Fail next save' })),
        Scene.Command.resolve(
          FailNextIssueSave,
          Message.CompletedFailNextIssueSave(),
        ),
        Scene.Navigation.changedUrl('/'),
        Scene.Navigation.changedUrl(issuePath),
        Scene.type(Scene.label('Issue title'), savedIssue.title),
        Scene.type(Scene.label('Description'), savedIssue.description),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.resolve(
          SaveIssue,
          IssueDetailBlock.Message.FailedSaveIssue({
            issueId: firstIssue.id,
            expectedVersion: firstIssue.version,
            error: RepositoryError.Unavailable({
              message: 'The workspace is temporarily unavailable.',
              operation: 'SaveIssue',
            }),
          }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(
          'The workspace is temporarily unavailable.',
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(savedIssue.title),
        Scene.expect(Scene.label('Description')).toHaveValue(
          savedIssue.description,
        ),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Retry save' })),
        Scene.Command.resolve(
          SaveIssue,
          IssueDetailBlock.Message.SucceededSaveIssue({
            saveResult: Issue.toSaveResult(savedIssue),
            expectedVersion: firstIssue.version,
          }),
        ),
        Scene.expect(Scene.role('alert')).not.toExist(),
        Scene.expect(
          Scene.role('link', {
            name: `${savedIssue.identifier} ${savedIssue.title}`,
          }),
        ).toExist(),
      )
    },
  )

  it.effect(
    'announces a failed load and renders the workspace after retrying',
    () => {
      return Scene.scene(
        application,
        Scene.init(url('/')),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.FailedLoadWorkspace({
            error: 'The workspace is temporarily unavailable.',
          }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(
          'The workspace is temporarily unavailable.',
        ),
        Scene.expect(
          Scene.role('heading', { name: 'Unable to load workspace' }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Retry loading' })),
        Scene.Command.expectExact(LoadWorkspace()),
        Scene.expect(Scene.text('Loading workspace…')).toExist(),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.expect(Scene.role('alert')).not.toExist(),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
      )
    },
  )

  it.effect(
    'preserves project fields after failure and publishes the retried save',
    () => {
      const project = Option.getOrThrow(Array.head(initialWorkspace.projects))

      const savedProject = modifyFields(project, {
        name: () => 'Platform engineering',
        description: () => 'Reliable foundations for every team.',
      })

      const error = 'The project service is temporarily unavailable.'
      return Scene.scene(
        application,
        Scene.init(url(`/projects/${project.id}/settings`)),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.expect(
          Scene.role('button', { name: 'Save changes' }),
        ).toBeDisabled(),
        Scene.type(Scene.label('Project name'), '   '),
        Scene.expect(
          Scene.role('button', { name: 'Save changes' }),
        ).toBeDisabled(),
        Scene.type(Scene.label('Project name'), savedProject.name),
        Scene.type(
          Scene.label('Project description'),
          savedProject.description,
        ),
        Scene.expect(
          Scene.role('button', { name: 'Save changes' }),
        ).toBeEnabled(),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.expect(Scene.role('button', { name: 'Saving…' })).toBeDisabled(),
        Scene.Command.expectExact(SaveProject({ project: savedProject })),
        Scene.Command.resolve(
          SaveProject,
          ProjectSettingsBlock.Message.FailedSaveProject({ error }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(error),
        Scene.expect(Scene.label('Project name')).toHaveValue(
          savedProject.name,
        ),
        Scene.expect(Scene.label('Project description')).toHaveValue(
          savedProject.description,
        ),
        Scene.expect(Scene.role('heading', { name: project.name })).toExist(),
        Scene.click(Scene.role('button', { name: 'Retry changes' })),
        Scene.Command.expectExact(SaveProject({ project: savedProject })),
        Scene.Command.resolve(
          SaveProject,
          ProjectSettingsBlock.Message.SucceededSaveProject({
            project: savedProject,
          }),
        ),
        Scene.expect(Scene.role('alert')).not.toExist(),
        Scene.expect(
          Scene.role('heading', { name: savedProject.name }),
        ).toExist(),
        Scene.expect(Scene.role('link', { name: savedProject.name })).toExist(),
        Scene.expect(Scene.text('Project saved')).toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Save changes' }),
        ).toBeDisabled(),
      )
    },
  )

  it.effect(
    'announces failed activity and clears the error after a successful retry',
    () => {
      const activityIssue = Option.getOrThrow(
        Workspace.findIssue(initialWorkspace, 'issue-105'),
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
      return Scene.scene(
        application,
        Scene.init(url('/settings')),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        Scene.click(Scene.role('button', { name: 'Simulate activity' })),
        Scene.Command.expectExact(
          AddIssueComment({
            issueId: firstIssue.id,
            authorId: 'alex',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Scene.Command.resolve(
          AddIssueComment,
          Message.FailedAddIssueComment({ error }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(error),
        Scene.expect(Scene.text('1 activity events requested')).toExist(),
        Scene.click(Scene.role('button', { name: 'Simulate activity' })),
        Scene.Command.expectExact(
          AddIssueComment({
            issueId: activityIssue.id,
            authorId: 'alex',
            body: 'The next iteration is ready. Let me know what you think.',
          }),
        ),
        Scene.Command.resolve(
          AddIssueComment,
          Message.SucceededAddIssueComment({
            issueId: commentedIssue.id,
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        Scene.expect(Scene.text(error)).not.toExist(),
        Scene.expect(Scene.text('2 activity events requested')).toExist(),
      )
    },
  )

  it.effect(
    'keeps the routed editor and its draft visible during a failed refresh',
    () => {
      return Effect.gen(function* () {
        const dirtyEditorModel = yield* Story.story(
          application,
          Story.init(url(issuePath)),
          Story.Command.resolve(
            LoadWorkspace,
            Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            firstIssue.id,
            IssueDetailBlock.Message.UpdatedTitle({
              value: 'Keep this draft while refreshing',
            }),
          ),
        )
        const refreshingModel = modifyFields(dirtyEditorModel, {
          workspaceAsyncData: workspaceAsyncData =>
            Option.getOrThrow(AsyncData.revalidateOrLoad(workspaceAsyncData)),
        })
        const failedRefreshModel = yield* Story.story(
          application,
          Story.given(dirtyEditorModel),
          Story.message(Message.ClickedRetryLoad()),
          Story.Command.resolve(
            LoadWorkspace,
            Message.FailedLoadWorkspace({
              error: 'The workspace is temporarily unavailable.',
            }),
          ),
        )

        yield* Scene.scene(
          application,
          Scene.given(refreshingModel),
          Scene.expect(Scene.label('Issue title')).toHaveValue(
            'Keep this draft while refreshing',
          ),
          Scene.expect(
            Scene.role('link', {
              name: `${firstIssue.identifier} ${firstIssue.title}`,
            }),
          ).toExist(),
          Scene.expect(Scene.text('Loading workspace…')).not.toExist(),
        )

        yield* Scene.scene(
          application,
          Scene.given(failedRefreshModel),
          Scene.expect(Scene.label('Issue title')).toHaveValue(
            'Keep this draft while refreshing',
          ),
          Scene.expect(
            Scene.role('link', {
              name: `${firstIssue.identifier} ${firstIssue.title}`,
            }),
          ).toExist(),
          Scene.expect(Scene.role('button', { name: 'Close issue' })).toExist(),
          Scene.expect(Scene.text('Unable to load workspace')).not.toExist(),
        )
      })
    },
  )

  it.effect(
    'keeps a dirty editor draft and offers the latest revision after a successful refresh',
    () => {
      return Effect.gen(function* () {
        const latestIssue = modifyFields(firstIssue, {
          title: () => 'A newer title loaded from the repository',
          version: version => version + 1,
        })
        const latestWorkspace = modifyFields(initialWorkspace, {
          issues: Array.map(issue =>
            issue.id === latestIssue.id ? latestIssue : issue,
          ),
        })
        const dirtyEditorModel = yield* Story.story(
          application,
          Story.init(url(issuePath)),
          Story.Command.resolve(
            LoadWorkspace,
            Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
          ),
          Story.messageIn(
            IssueDetailsBinding,
            firstIssue.id,
            IssueDetailBlock.Message.UpdatedTitle({
              value: 'Keep this unsaved title',
            }),
          ),
        )
        const refreshedModel = yield* Story.story(
          application,
          Story.given(dirtyEditorModel),
          Story.message(Message.ClickedRetryLoad()),
          Story.Command.resolve(
            LoadWorkspace,
            Message.SucceededLoadWorkspace({ workspace: latestWorkspace }),
          ),
        )

        yield* Scene.scene(
          application,
          Scene.given(refreshedModel),
          Scene.expect(Scene.label('Issue title')).toHaveValue(
            'Keep this unsaved title',
          ),
          Scene.expect(
            Scene.role('link', {
              name: `${latestIssue.identifier} ${latestIssue.title}`,
            }),
          ).toExist(),
          Scene.expect(Scene.role('alert')).toContainText(
            'Your draft is preserved',
          ),
          Scene.click(Scene.role('button', { name: 'Reload issue' })),
          Scene.expect(Scene.label('Issue title')).toHaveValue(
            latestIssue.title,
          ),
          Scene.expect(Scene.role('alert')).not.toExist(),
        )
      })
    },
  )
})
