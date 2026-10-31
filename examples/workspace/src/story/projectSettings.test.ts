import { Array, Option, Record } from 'effect'
import { Command, message, model, steps, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { Message } from '../application'
import {
  type ResolvedModel,
  application,
  issueMoveMessage,
  loadWorkspace,
  projectSettingsForm,
  projectSettingsMessage,
  startAt,
  url,
  visibleWorkspaceOf,
} from '../application.fixture'
import { initialWorkspace } from '../domain/seed'
import { IssueMove, MoveIssue } from '../issueMove'
import { IssueMoveState } from '../issueMove'
import { ProjectSettings } from '../projectSettings'
import { SaveProject } from '../projectSettings'
import { ApplicationRoute } from '../route'
import { RepositoryError } from '../services'

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))

const pendingIssueMove = IssueMoveState.MovingIssue({
  issueId: issueA.id,
  status: 'Done',
  insertionIndex: 0,
  expectedVersion: issueA.version,
})

const pendingIssueMoveCommand = MoveIssue({
  issueId: issueA.id,
  status: 'Done',
  insertionIndex: 0,
  expectedVersion: issueA.version,
})

const beginIssueMove = steps(
  message(
    issueMoveMessage(
      IssueMove.Message.FailedMoveIssue({
        issueId: issueA.id,
        status: 'Done',
        insertionIndex: 0,
        error: RepositoryError.Unavailable({
          operation: 'Move',
          message: 'The move is unavailable.',
        }),
      }),
    ),
  ),
  message(issueMoveMessage(IssueMove.Message.ClickedRetryMove())),
  model((model: ResolvedModel) => {
    expect(model.issueMove.state).toEqual(pendingIssueMove)
  }),
  Command.expectExact(pendingIssueMoveCommand),
)

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
    () =>
      story(
        application,
        startAt(projectSettingsPath),
        loadWorkspace,
        message(
          projectSettingsMessage(
            project.id,
            ProjectSettings.Message.UpdatedProjectName({
              value: 'Unfinished project name',
            }),
          ),
        ),
        message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
        model(model => {
          expect(projectSettingsForm(model, project.id).draft.name).toBe(
            'Unfinished project name',
          )
        }),
        Command.expectNone(),
      ),
  )

  it.effect(
    'keeps separate drafts across project switches and workspace refreshes',
    () =>
      story(
        application,
        startAt(projectSettingsPath),
        loadWorkspace,
        message(
          projectSettingsMessage(
            project.id,
            ProjectSettings.Message.UpdatedProjectName({
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
          expect(projectSettingsForm(model, anotherProject.id).draft.name).toBe(
            anotherProject.name,
          )
        }),
        message(
          Message.SucceededLoadWorkspace({ workspace: initialWorkspace }),
        ),
        message(Message.ChangedUrl({ url: url(projectSettingsPath) })),
        model(model => {
          expect(projectSettingsForm(model, project.id).draft.name).toBe(
            'Unfinished platform work',
          )
          expect(Record.values(model.projectSettings)).toHaveLength(2)
        }),
        Command.expectNone(),
      ),
  )

  it.effect(
    'saves project settings while an unrelated issue move is pending',
    () => {
      const savedProject = modifyFields(project, { name: () => 'New name' })

      return story(
        application,
        startAt(projectSettingsPath),
        loadWorkspace,
        beginIssueMove,
        message(
          projectSettingsMessage(
            project.id,
            ProjectSettings.Message.UpdatedProjectName({
              value: savedProject.name,
            }),
          ),
        ),
        message(
          projectSettingsMessage(
            project.id,
            ProjectSettings.Message.SubmittedProjectSettings(),
          ),
        ),
        Command.expectExact(
          pendingIssueMoveCommand,
          SaveProject({ project: savedProject }),
        ),
        Command.resolve(
          SaveProject,
          ProjectSettings.Message.SucceededSaveProject({
            project: savedProject,
          }),
        ),
        Command.resolve(
          MoveIssue,
          IssueMove.Message.SucceededMoveIssue({
            movedIssue: {
              issueId: issueA.id,
              status: 'Done',
              insertionIndex: 0,
              version: issueA.version + 1,
            },
          }),
        ),
      )
    },
  )

  it.effect(
    'settles a project save after navigating away without touching another editor',
    () => {
      const savedProject = modifyFields(project, {
        name: () => 'Saved while away',
      })

      return story(
        application,
        startAt(projectSettingsPath),
        loadWorkspace,
        beginIssueMove,
        message(
          projectSettingsMessage(
            project.id,
            ProjectSettings.Message.UpdatedProjectName({
              value: savedProject.name,
            }),
          ),
        ),
        message(
          projectSettingsMessage(
            project.id,
            ProjectSettings.Message.SubmittedProjectSettings(),
          ),
        ),
        Command.expectExact(
          pendingIssueMoveCommand,
          SaveProject({ project: savedProject }),
        ),
        message(
          Message.ChangedUrl({
            url: url(`/projects/${anotherProject.id}/settings`),
          }),
        ),
        Command.resolve(
          SaveProject,
          ProjectSettings.Message.SucceededSaveProject({
            project: savedProject,
          }),
        ),
        model(model => {
          expect(projectSettingsForm(model, project.id).baseline).toEqual(
            savedProject,
          )
          expect(projectSettingsForm(model, anotherProject.id).draft.name).toBe(
            anotherProject.name,
          )
          expect(model.route).toEqual(
            ApplicationRoute.ProjectSettings({
              projectId: anotherProject.id,
            }),
          )
        }),
        Command.resolve(
          MoveIssue,
          IssueMove.Message.SucceededMoveIssue({
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
    },
  )

  it.effect('publishes only the project returned by a completed save', () => {
    const savedProject = modifyFields(project, {
      name: () => 'Platform engineering',
    })

    return story(
      application,
      startAt(projectSettingsPath),
      loadWorkspace,
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettings.Message.UpdatedProjectName({
            value: savedProject.name,
          }),
        ),
      ),
      message(
        projectSettingsMessage(
          project.id,
          ProjectSettings.Message.SubmittedProjectSettings(),
        ),
      ),
      Command.expectExact(SaveProject({ project: savedProject })),
      Command.resolve(
        SaveProject,
        ProjectSettings.Message.SucceededSaveProject({
          project: savedProject,
        }),
      ),
      model(model => {
        expect(visibleWorkspaceOf(model).projects).toContainEqual(savedProject)
        expect(visibleWorkspaceOf(model).issues).toEqual(
          initialWorkspace.issues,
        )
      }),
    )
  })

  it.effect('does not initialize settings for an unknown project', () =>
    story(
      application,
      startAt('/projects/missing/settings'),
      loadWorkspace,
      model(model => {
        expect(model.projectSettings).toEqual({})
      }),
      Command.expectNone(),
    ),
  )
})
