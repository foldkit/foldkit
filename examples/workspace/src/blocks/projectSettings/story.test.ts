import { Array, Effect, Option } from 'effect'
import {
  Command,
  type TestBlock,
  expectNoOutMessage,
  expectOutMessage,
  given,
  init,
  message,
  model,
  story,
  withBlock,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { layer } from './block'
import { SaveProject } from './command'
import { ProjectSettingsBlock } from './definition'
import { Message } from './message'
import { Model, SaveState } from './model'
import { OutMessage } from './outMessage'

const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
const makeInitialModel = (
  executable: TestBlock<typeof ProjectSettingsBlock>,
) => {
  const init = executable.init
  return Model.make(init(project).model)
}

describe('Project Settings', () => {
  it.effect(
    'does not save unchanged, normalized, or invalid project settings',
    () => {
      return withBlock(ProjectSettingsBlock, executable =>
        Effect.gen(function* () {
          const initialModel = makeInitialModel(executable)

          const paddedNameModel = modifyFields(initialModel, {
            draft: draft => modifyFields(draft, { name: name => ` ${name} ` }),
          })
          const blankNameModel = modifyFields(initialModel, {
            draft: draft => modifyFields(draft, { name: () => '   ' }),
          })

          for (const unsavableModel of [
            initialModel,
            paddedNameModel,
            blankNameModel,
          ]) {
            yield* story(
              ProjectSettingsBlock,
              given(unsavableModel),
              message(Message.SubmittedProjectSettings()),
              model(model => {
                expect(model).toBe(unsavableModel)
              }),
              Command.expectNone(),
              expectNoOutMessage(),
            )
          }
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'keeps one pending save stable against duplicate submission, edits and discard',
    () => {
      const savedProject = modifyFields(project, {
        name: () => 'A new project name',
      })
      return story(
        ProjectSettingsBlock,
        init(project),
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
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'does not publish an unsolicited or mismatched project save',
    () => {
      return withBlock(ProjectSettingsBlock, executable =>
        Effect.gen(function* () {
          const initialModel = makeInitialModel(executable)

          const otherProject = Option.getOrThrow(
            Array.findFirst(
              initialWorkspace.projects,
              candidate => candidate.id !== project.id,
            ),
          )

          yield* story(
            ProjectSettingsBlock,
            given(initialModel),
            message(Message.SucceededSaveProject({ project })),
            model(model => {
              expect(model).toBe(initialModel)
            }),
            expectNoOutMessage(),
          )

          const savingModel = modifyFields(initialModel, {
            saveState: () => SaveState.Saving(),
          })

          yield* story(
            ProjectSettingsBlock,
            given(savingModel),
            message(Message.SucceededSaveProject({ project: otherProject })),
            model(model => {
              expect(model).toBe(savingModel)
            }),
            expectNoOutMessage(),
          )
        }),
      ).pipe(Effect.provide(layer))
    },
  )

  it.effect(
    'normalizes a name in the saved payload and makes the saved values the next baseline',
    () => {
      const savedProject = modifyFields(project, { name: () => 'A new name' })
      return story(
        ProjectSettingsBlock,
        init(project),
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
      ).pipe(Effect.provide(layer))
    },
  )
})
