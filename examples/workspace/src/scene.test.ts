import { Array, Effect, Option, Record } from 'effect'
import { Scene, Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { describe, expect as expectValue, it } from '@effect/vitest'
import { Listbox } from '@foldkit/ui'

import { LoadWorkspace, NavigateInternal } from './application'
import { Message } from './application'
import {
  type ResolvedModel,
  application,
  loadWorkspace,
  startAt,
  url,
  workspacePageMessage,
} from './application.fixture'
import { Comment, IssueFilters, SavedView } from './domain/domain'
import { savedIssueFromIssue } from './domain/issue'
import { initialWorkspace } from './domain/seed'
import { IssueDetail } from './issueDetail/issueDetail'
import { SaveIssue } from './issueDetail/issueDetail'
import { WorkspaceListbox } from './listbox'
import { ProjectSettings } from './projectSettings'
import { SaveProject } from './projectSettings'
import {
  appliedIssueFilters,
  issueHref,
  issuesRouter,
  savedViewRouter,
} from './route'
import { RepositoryError } from './services'
import { AppendActivity, TeammateActivity } from './teammateActivity'
import { WorkspacePage } from './workspacePage'
import { SimulateSaveFailure, WorkspaceSettings } from './workspaceSettings'

const firstIssue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issuePath = issuesRouter({ issueId: firstIssue.id })

const deliverWorkspace = Scene.deliver(
  Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
)

const deliverUrl = (path: string) =>
  Scene.deliver(Message.ChangedUrl({ url: url(path) }))

const capturedModel = (
  path: string,
  ...messages: ReadonlyArray<typeof Message.Type>
) =>
  Effect.gen(function* () {
    const captured: Array<ResolvedModel> = []

    yield* Story.story(
      application,
      startAt(path),
      ...Array.map(messages, Story.message),
      Story.model(current => {
        captured.push(current)
      }),
    )

    return Option.getOrThrow(Array.last(captured))
  })

const loadedModel = (path = '/') =>
  capturedModel(
    path,
    Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
  )

describe('workspace application', () => {
  it.effect('marks the current workspace and project navigation links', () =>
    Effect.gen(function* () {
      yield* Scene.scene(
        application,
        startAt('/projects/platform/board'),
        deliverWorkspace,
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
      )

      yield* Scene.scene(
        application,
        startAt('/people'),
        deliverWorkspace,
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
    }),
  )

  it.effect(
    'does not render a retained issue editor after its route is hidden',
    () =>
      Effect.gen(function* () {
        yield* Story.story(
          application,
          startAt(issuePath),
          loadWorkspace,
          Story.message(Message.ChangedUrl({ url: url('/people') })),
          Story.model(model => {
            expectValue(
              Record.values(model.issuePane.issueDetails),
            ).toHaveLength(1)
          }),
        )

        yield* Scene.scene(
          application,
          startAt(issuePath),
          deliverWorkspace,
          Scene.expect(Scene.label('Issue title')).toExist(),
          deliverUrl('/people'),
          Scene.expect(Scene.role('heading', { name: 'People' })).toExist(),
          Scene.expect(Scene.label('Issue title')).not.toExist(),
          Scene.expect(
            Scene.role('button', { name: 'Close issue' }),
          ).not.toExist(),
        )
      }),
  )

  it.effect(
    'selects the active member through its Listbox before requesting activity',
    () =>
      Effect.gen(function* () {
        const loaded = yield* loadedModel('/settings')

        yield* Scene.scene(
          application,
          startAt('/settings'),
          Scene.given(loaded),
          Scene.click(Scene.role('button', { name: 'Active member' })),
          Scene.Command.resolve(
            Listbox.test.FocusListboxItems,
            WorkspaceListbox.Message.CompletedFocusListboxItems(),
          ),
          Scene.Mount.resolve(
            Listbox.test.AnchorListbox,
            WorkspaceListbox.Message.CompletedAnchorListbox(),
          ),
          Scene.Mount.resolve(
            Listbox.test.PortalListboxBackdrop,
            WorkspaceListbox.Message.CompletedPortalListboxBackdrop(),
          ),
          Scene.click(Scene.role('option', { name: 'Jordan Lee' })),
          Scene.Command.resolve(
            Listbox.test.FocusListboxButton,
            WorkspaceListbox.Message.CompletedFocusListboxButton(),
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
            AppendActivity({
              issueId: 'issue-104',
              authorId: 'maya',
              body: 'I checked the latest changes. This is ready for another look.',
            }),
          ),
          Scene.Command.resolve(
            AppendActivity,
            TeammateActivity.Message.FailedAppendActivity({
              error: 'Activity is unavailable.',
            }),
          ),
        )
      }),
  )

  it.effect('renders the loading and loaded workspace states', () =>
    Effect.gen(function* () {
      yield* Scene.scene(
        application,
        startAt('/'),
        Scene.expect(Scene.text('Loading workspace…')).toExist(),
      )

      const loaded = yield* loadedModel()

      yield* Scene.scene(
        application,
        startAt('/'),
        Scene.given(loaded),
        Scene.expect(Scene.role('heading', { name: 'All issues' })).toExist(),
        Scene.expect(Scene.text('16 issues')).toExist(),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
      )
    }),
  )

  it.effect(
    'preserves saved filters in an issue panel without saved view metadata',
    () =>
      Effect.gen(function* () {
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
        const modelWithPreset = modifyFields(yield* loadedModel(), {
          savedViews: () => [savedView],
        })
        const savedViewPath = savedViewRouter({
          viewId: savedView.id,
          filters,
        })
        const hrefs: Array<string> = []

        yield* Story.story(
          application,
          startAt('/'),
          Story.given(modelWithPreset),
          Story.message(
            Message.ChangedUrl({ url: url(`/views/${savedView.id}`) }),
          ),
          Story.model(savedViewModel => {
            hrefs.push(issueHref(savedViewModel, firstIssue.id))
          }),
        )

        const href = Option.getOrThrow(Array.last(hrefs))

        expectValue(href).toBe(
          savedViewRouter({
            viewId: savedView.id,
            filters,
            issueId: firstIssue.id,
          }),
        )

        yield* Story.story(
          application,
          startAt(href),
          loadWorkspace,
          Story.model(reloadedIssueModel => {
            expectValue(reloadedIssueModel.savedViews).toEqual([])
            expectValue(appliedIssueFilters(reloadedIssueModel)).toEqual(
              filters,
            )
          }),
        )

        yield* Scene.scene(
          application,
          startAt(href),
          deliverWorkspace,
          Scene.click(Scene.role('button', { name: 'Close issue' })),
          Scene.Command.expectExact(NavigateInternal({ url: savedViewPath })),
          Scene.Command.resolve(
            NavigateInternal,
            Message.CompletedNavigateInternal(),
          ),
        )

        const savedViewModel = yield* loadedModel(savedViewPath)

        yield* Scene.scene(
          application,
          startAt(savedViewPath),
          Scene.given(savedViewModel),
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
      }),
  )

  it.effect(
    'retains the draft after failure and updates the list after a successful retry',
    () => {
      const savedIssueSnapshot = modifyFields(firstIssue, {
        title: () => 'Keep the issue draft when a save fails',
        description: () =>
          'Retry the current draft after the service recovers.',
        version: version => version + 1,
      })

      return Scene.scene(
        application,
        startAt('/settings'),
        deliverWorkspace,
        Scene.click(Scene.role('button', { name: 'Fail next save' })),
        Scene.Command.resolve(
          SimulateSaveFailure,
          WorkspaceSettings.Message.CompletedSimulateSaveFailure(),
        ),
        deliverUrl('/'),
        deliverUrl(issuePath),
        Scene.type(Scene.label('Issue title'), savedIssueSnapshot.title),
        Scene.type(Scene.label('Description'), savedIssueSnapshot.description),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.resolve(
          SaveIssue,
          IssueDetail.Message.FailedSaveIssue({
            issueId: firstIssue.id,
            expectedVersion: firstIssue.version,
            error: RepositoryError.Unavailable({
              message: 'The workspace is temporarily unavailable.',
              operation: 'Save',
            }),
          }),
        ),
        Scene.expect(Scene.role('alert')).toContainText(
          'The workspace is temporarily unavailable.',
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(
          savedIssueSnapshot.title,
        ),
        Scene.expect(Scene.label('Description')).toHaveValue(
          savedIssueSnapshot.description,
        ),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Retry save' })),
        Scene.Command.resolve(
          SaveIssue,
          IssueDetail.Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: firstIssue.version,
          }),
        ),
        Scene.expect(Scene.role('alert')).not.toExist(),
        Scene.expect(
          Scene.role('link', {
            name: `${savedIssueSnapshot.identifier} ${savedIssueSnapshot.title}`,
          }),
        ).toExist(),
      )
    },
  )

  it.effect(
    'announces a failed load and renders the workspace after retrying',
    () =>
      Effect.gen(function* () {
        const workspaceLoadFailure = yield* capturedModel(
          '/',
          Message.FailedLoadWorkspace({
            error: 'The workspace is temporarily unavailable.',
          }),
        )

        yield* Scene.scene(
          application,
          startAt('/'),
          Scene.given(workspaceLoadFailure),
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
      }),
  )

  it.effect(
    'announces failed activity and clears the error after a successful retry',
    () =>
      Effect.gen(function* () {
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
        const loaded = yield* loadedModel('/settings')

        yield* Scene.scene(
          application,
          startAt('/settings'),
          Scene.given(loaded),
          Scene.click(Scene.role('button', { name: 'Simulate activity' })),
          Scene.Command.expectExact(
            AppendActivity({
              issueId: firstIssue.id,
              authorId: 'alex',
              body: 'I checked the latest changes. This is ready for another look.',
            }),
          ),
          Scene.Command.resolve(
            AppendActivity,
            TeammateActivity.Message.FailedAppendActivity({ error }),
          ),
          Scene.expect(Scene.role('alert')).toContainText(error),
          Scene.expect(Scene.text('1 activity events requested')).toExist(),
          Scene.click(Scene.role('button', { name: 'Simulate activity' })),
          Scene.Command.expectExact(
            AppendActivity({
              issueId: activityIssue.id,
              authorId: 'alex',
              body: 'The next iteration is ready. Let me know what you think.',
            }),
          ),
          Scene.Command.resolve(
            AppendActivity,
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: commentedIssue.id,
              comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
            }),
          ),
          Scene.expect(Scene.text(error)).not.toExist(),
          Scene.expect(Scene.text('2 activity events requested')).toExist(),
        )
      }),
  )

  it.effect(
    'a conflict updates shared data and lets the editor reload before saving again',
    () => {
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

      return Scene.scene(
        application,
        startAt(issuePath),
        deliverWorkspace,
        Scene.type(Scene.label('Issue title'), 'Keep this local draft'),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.keepPending(pendingSave),
        Scene.deliver(Message.TickedActivityStream()),
        Scene.Command.expectExact(
          pendingSave,
          AppendActivity({
            issueId: firstIssue.id,
            authorId: 'alex',
            body: 'I checked the latest changes. This is ready for another look.',
          }),
        ),
        Scene.Command.resolve(
          AppendActivity,
          TeammateActivity.Message.SucceededAppendActivity({
            issueId: latestIssue.id,
            comment: Option.getOrThrow(Array.last(latestIssue.comments)),
          }),
        ),
        Scene.expect(
          Scene.text('The conversation stays current while you edit.'),
        ).toExist(),
        Scene.Command.resolve(
          pendingSave,
          IssueDetail.Message.FailedSaveIssue({
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
        Scene.type(Scene.label('Issue title'), savedIssueSnapshot.title),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.expectExact(
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
        Scene.Command.resolve(
          SaveIssue,
          IssueDetail.Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: latestIssue.version,
          }),
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(
          savedIssueSnapshot.title,
        ),
      )
    },
  )

  it.effect(
    'updates the canonical issue and its list row after saving a draft',
    () => {
      const savedIssueSnapshot = modifyFields(firstIssue, {
        title: () => 'Find every project from one command menu',
        version: version => version + 1,
      })

      return Scene.scene(
        application,
        startAt(issuePath),
        deliverWorkspace,
        Scene.type(Scene.label('Issue title'), savedIssueSnapshot.title),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
        Scene.click(Scene.role('button', { name: 'Save changes' })),
        Scene.Command.resolve(
          SaveIssue,
          IssueDetail.Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: firstIssue.version,
          }),
        ),
        Scene.expect(
          Scene.role('link', {
            name: `${savedIssueSnapshot.identifier} ${savedIssueSnapshot.title}`,
          }),
        ).toExist(),
        Scene.expect(Scene.label('Issue title')).toHaveValue(
          savedIssueSnapshot.title,
        ),
        Scene.expect(
          Scene.text(`${savedIssueSnapshot.identifier} saved`),
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
        startAt(`/projects/${project.id}/settings`),
        deliverWorkspace,
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
          ProjectSettings.Message.FailedSaveProject({ error }),
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
          ProjectSettings.Message.SucceededSaveProject({
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
    'keeps the routed editor and its draft visible during a failed refresh',
    () =>
      Scene.scene(
        application,
        startAt(issuePath),
        deliverWorkspace,
        Scene.type(
          Scene.label('Issue title'),
          'Keep this draft while refreshing',
        ),
        Scene.deliver(
          workspacePageMessage(WorkspacePage.Message.ClickedRetryLoad()),
        ),
        Scene.expect(Scene.label('Issue title')).toHaveValue(
          'Keep this draft while refreshing',
        ),
        Scene.expect(
          Scene.role('link', {
            name: `${firstIssue.identifier} ${firstIssue.title}`,
          }),
        ).toExist(),
        Scene.expect(Scene.text('Loading workspace…')).not.toExist(),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.FailedLoadWorkspace({
            error: 'The workspace is temporarily unavailable.',
          }),
        ),
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
      ),
  )

  it.effect(
    'keeps a dirty editor draft and offers the latest revision after a successful refresh',
    () => {
      const latestIssue = modifyFields(firstIssue, {
        title: () => 'A newer title loaded from the repository',
        version: version => version + 1,
      })
      const latestWorkspace = modifyFields(initialWorkspace, {
        issues: Array.map(issue =>
          issue.id === latestIssue.id ? latestIssue : issue,
        ),
      })

      return Scene.scene(
        application,
        startAt(issuePath),
        deliverWorkspace,
        Scene.type(Scene.label('Issue title'), 'Keep this unsaved title'),
        Scene.deliver(
          workspacePageMessage(WorkspacePage.Message.ClickedRetryLoad()),
        ),
        Scene.Command.resolve(
          LoadWorkspace,
          Message.SucceededLoadWorkspace({ workspace: latestWorkspace }),
        ),
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
        Scene.expect(Scene.label('Issue title')).toHaveValue(latestIssue.title),
        Scene.expect(Scene.role('alert')).not.toExist(),
      )
    },
  )
})
