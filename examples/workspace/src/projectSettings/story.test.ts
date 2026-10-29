import { Array, Option } from 'effect'
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
import { describe, expect, test } from 'vitest'

import { initialWorkspace } from '../domain'
import { SaveProject } from './command'
import { init } from './init'
import { Message } from './message'
import { Model, SaveState } from './model'
import { OutMessage } from './outMessage'
import { update } from './update'

const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
const initialModel = Model.make(init(project).model)

describe('Project Settings', () => {
  test('does not save unchanged, normalized, or invalid project settings', () => {
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
      story(
        update,
        given(unsavableModel),
        message(Message.SubmittedProjectSettings()),
        model(model => {
          expect(model).toBe(unsavableModel)
        }),
        Command.expectNone(),
        expectNoOutMessage(),
      )
    }
  })

  test('keeps one pending save stable against duplicate submission, edits and discard', () => {
    const savedProject = modifyFields(project, {
      name: () => 'A new project name',
    })

    story(
      update,
      given(initialModel),
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
    )
  })

  test('does not publish an unsolicited or mismatched project save', () => {
    const otherProject = Option.getOrThrow(
      Array.findFirst(
        initialWorkspace.projects,
        candidate => candidate.id !== project.id,
      ),
    )

    story(
      update,
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

    story(
      update,
      given(savingModel),
      message(Message.SucceededSaveProject({ project: otherProject })),
      model(model => {
        expect(model).toBe(savingModel)
      }),
      expectNoOutMessage(),
    )
  })

  test('normalizes a name in the saved payload and makes the saved values the next baseline', () => {
    const savedProject = modifyFields(project, { name: () => 'A new name' })

    story(
      update,
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
    )
  })
})
