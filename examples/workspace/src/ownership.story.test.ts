import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { ProjectSettingsBinding } from './composition'
import { initialSnapshot } from './domain'
import { init } from './init'
import { Message } from './message'
import { IssueMoveState, type Model } from './model'
import { ProjectSettingsBlock } from './projectSettings'
import { SaveProject } from './projectSettings/command'
import { SaveState as ProjectSaveState } from './projectSettings/definition'
import { ApplicationRoute } from './route'
import { update } from './update'

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const loadedModel = () =>
  update(
    init(url('/projects/platform/settings')).model,
    Message.SucceededLoadWorkspace({ snapshot: initialSnapshot }),
  ).model

const project = Option.getOrThrow(Array.head(initialSnapshot.projects))

const settingsView = (model: typeof Model.Type, projectId = 'platform') => {
  const instance = Option.getOrThrow(
    Array.findFirst(
      model.projectSettingsInstances,
      instance => instance.projectId === projectId,
    ),
  )

  return ProjectSettingsBinding.embedView({
    key: projectId,
    slotId: `project-settings-${projectId}`,
    model: instance.model,
  })
}

const settingsModel = (model: typeof Model.Type, projectId = 'platform') =>
  Option.getOrThrow(
    Array.findFirst(
      model.projectSettingsInstances,
      instance => instance.projectId === projectId,
    ),
  ).model

describe('workspace ownership', () => {
  test('preserves project edits when the current URL is delivered again', () => {
    const initial = loadedModel()

    story(
      update,
      given(initial),
      message(
        settingsView(initial).toParentMessage(
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: 'Unfinished project name',
          }),
        ),
      ),
      message(Message.ChangedUrl({ url: url('/projects/platform/settings') })),
      model(model => {
        expect(settingsModel(model).draft.name).toBe('Unfinished project name')
      }),
      Command.expectNone(),
    )
  })

  test('can save project settings while an unrelated issue move is pending', () => {
    const issue = Option.getOrThrow(Array.head(initialSnapshot.issues))
    const savedProject = modifyFields(project, { name: () => 'New name' })
    const initial = modifyFields(loadedModel(), {
      issueMoveState: () =>
        IssueMoveState.MovingIssue({
          issueId: issue.id,
          previousStatus: issue.status,
          previousIndex: 0,
          expectedVersion: issue.version,
        }),
    })

    story(
      update,
      given(initial),
      message(
        settingsView(initial).toParentMessage(
          ProjectSettingsBlock.Message.UpdatedProjectName({
            value: savedProject.name,
          }),
        ),
      ),
      message(
        settingsView(initial).toParentMessage(
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

  test('background activity does not clear an unrelated foreground notice', () => {
    const issue = Option.getOrThrow(Array.head(initialSnapshot.issues))

    story(
      update,
      given(
        modifyFields(loadedModel(), {
          maybeNotice: () => Option.some('Saved view “My work”'),
        }),
      ),
      message(Message.SucceededAppendActivity({ issue })),
      model(model => {
        expect(model.maybeNotice).toEqual(Option.some('Saved view “My work”'))
      }),
      Command.expectNone(),
    )
  })

  test('keeps separate drafts across project switches and workspace refreshes', () => {
    const initial = loadedModel()
    const anotherProject = Option.getOrThrow(
      Array.findFirst(
        initialSnapshot.projects,
        candidate => candidate.id !== project.id,
      ),
    )
    const settings = settingsView(initial)

    story(
      update,
      given(initial),
      message(
        settings.toParentMessage(
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
        expect(settingsModel(model, anotherProject.id).draft.name).toBe(
          anotherProject.name,
        )
      }),
      message(Message.SucceededLoadWorkspace({ snapshot: initialSnapshot })),
      message(Message.ChangedUrl({ url: url('/projects/platform/settings') })),
      model(model => {
        expect(settingsModel(model).draft.name).toBe('Unfinished platform work')
        expect(model.projectSettingsInstances).toHaveLength(2)
      }),
      Command.expectNone(),
    )
  })

  test('settles a project save after navigating away without touching another editor', () => {
    const original = loadedModel()
    const savedProject = modifyFields(project, {
      name: () => 'Saved while away',
    })
    const initial = modifyFields(original, {
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
    const anotherProject = Option.getOrThrow(
      Array.findFirst(
        initialSnapshot.projects,
        candidate => candidate.id !== project.id,
      ),
    )

    story(
      update,
      given(initial),
      message(
        Message.ChangedUrl({
          url: url(`/projects/${anotherProject.id}/settings`),
        }),
      ),
      message(
        settingsView(initial).toParentMessage(
          ProjectSettingsBlock.Message.SucceededSaveProject({
            project: savedProject,
          }),
        ),
      ),
      model(model => {
        expect(settingsModel(model).baseline).toEqual(savedProject)
        expect(settingsModel(model, anotherProject.id).draft.name).toBe(
          anotherProject.name,
        )

        expect(model.route).toEqual(
          ApplicationRoute.ProjectSettings({ projectId: anotherProject.id }),
        )
      }),
      message(Message.SucceededMoveIssue({ snapshot: initialSnapshot })),
      model(model => {
        const snapshot = Option.getOrThrow(
          AsyncData.getData(model.workspaceAsyncData),
        )

        expect(snapshot.projects).toContainEqual(savedProject)
      }),
      Command.expectNone(),
    )
  })
})
