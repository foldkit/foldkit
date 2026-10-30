import { Array, Effect, Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { initialWorkspace } from './domain/seed'
import {
  Message,
  type Model,
  OutMessage,
  ProjectSettingsLive,
  SaveProject,
  SaveState,
} from './projectSettings'
import { WorkspaceRepositoryLayer } from './services'

const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
const initialModel: Model = {
  baseline: project,
  draft: { name: project.name, description: project.description },
  saveState: SaveState.Idle(),
}

describe('Project Settings', () => {
  it.effect('initializes its form from the project', () =>
    story(
      ProjectSettingsLive,
      { project },
      model(model => {
        expect(model).toEqual(initialModel)
      }),
      expectNoOutMessage(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer)),
  )

  it.effect(
    'does not save unchanged, normalized, or invalid project settings',
    () => {
      const paddedNameModel = modifyFields(initialModel, {
        draft: draft => modifyFields(draft, { name: name => ` ${name} ` }),
      })
      const blankNameModel = modifyFields(initialModel, {
        draft: draft => modifyFields(draft, { name: () => '   ' }),
      })

      return Effect.forEach(
        [initialModel, paddedNameModel, blankNameModel],
        unsavableModel =>
          story(
            ProjectSettingsLive,
            { project },
            given(unsavableModel),
            message(Message.SubmittedProjectSettings()),
            model(model => {
              expect(model).toEqual(unsavableModel)
            }),
            Command.expectNone(),
            expectNoOutMessage(),
          ),
        { discard: true },
      ).pipe(Effect.provide(WorkspaceRepositoryLayer))
    },
  )

  it.effect(
    'keeps one pending save stable against duplicate submission, edits and discard',
    () => {
      const savedProject = modifyFields(project, {
        name: () => 'A new project name',
      })

      return story(
        ProjectSettingsLive,
        { project },
        message(Message.UpdatedProjectName({ value: savedProject.name })),
        message(Message.SubmittedProjectSettings()),
        Command.expectExact(SaveProject({ project: savedProject })),
        message(Message.UpdatedProjectName({ value: 'An edit during save' })),
        message(Message.UpdatedProjectDescription({ value: 'Another edit' })),
        message(Message.ClickedDiscardChanges()),
        message(Message.SubmittedProjectSettings()),
        message(Message.ClickedRetrySave()),
        model(model => {
          expect(model.draft).toEqual({
            name: savedProject.name,
            description: savedProject.description,
          })
          expect(model.saveState).toEqual(SaveState.Saving())
        }),
        Command.expectExact(SaveProject({ project: savedProject })),
        expectNoOutMessage(),
        Command.resolve(
          SaveProject,
          Message.SucceededSaveProject({ project: savedProject }),
        ),
        expectOutMessage(OutMessage.Saved({ project: savedProject })),
      ).pipe(Effect.provide(WorkspaceRepositoryLayer))
    },
  )

  it.effect(
    'does not publish an unsolicited or mismatched project save',
    () => {
      const otherProject = Option.getOrThrow(
        Array.findFirst(
          initialWorkspace.projects,
          candidate => candidate.id !== project.id,
        ),
      )

      const savingModel = modifyFields(initialModel, {
        saveState: () => SaveState.Saving(),
      })

      return Effect.andThen(
        story(
          ProjectSettingsLive,
          { project },
          given(initialModel),
          message(Message.SucceededSaveProject({ project })),
          model(model => {
            expect(model).toEqual(initialModel)
          }),
          expectNoOutMessage(),
        ),
        story(
          ProjectSettingsLive,
          { project },
          given(savingModel),
          message(Message.SucceededSaveProject({ project: otherProject })),
          model(model => {
            expect(model).toEqual(savingModel)
          }),
          expectNoOutMessage(),
        ),
      ).pipe(Effect.provide(WorkspaceRepositoryLayer))
    },
  )

  it.effect(
    'normalizes a name in the saved payload and makes the saved values the next baseline',
    () => {
      const savedProject = modifyFields(project, { name: () => 'A new name' })

      return story(
        ProjectSettingsLive,
        { project },
        given(initialModel),
        message(Message.UpdatedProjectName({ value: ' A new name ' })),
        message(Message.SubmittedProjectSettings()),
        Command.expectExact(SaveProject({ project: savedProject })),
        Command.resolve(
          SaveProject,
          Message.SucceededSaveProject({ project: savedProject }),
        ),
        expectOutMessage(OutMessage.Saved({ project: savedProject })),
        model(model => {
          expect(model.baseline).toEqual(savedProject)
          expect(model.draft.name).toBe(savedProject.name)
        }),
      ).pipe(Effect.provide(WorkspaceRepositoryLayer))
    },
  )
})
