import { Array, Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  init,
  message,
  model,
  models,
  story,
  steps,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { ProjectSettingsBlock } from './block'
import { SaveProject } from './command'
import { layer } from './layer'
import { Message } from './message'
import { SaveState } from './model'
import { OutMessage } from './outMessage'

const projectSettingsSubject = { block: ProjectSettingsBlock, layer }

const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
describe('Project Settings', () => {
  it.effect(
    'does not save unchanged, normalized, or invalid project settings',
    () => {
      return story(
        projectSettingsSubject,
        init(project),
        models(
          steps(message(Message.SubmittedProjectSettings())),
          (before, after) => expect(after).toBe(before),
        ),
        Command.expectNone(),
        expectNoOutMessage(),
        message(Message.UpdatedProjectName({ value: ` ${project.name} ` })),
        models(
          steps(message(Message.SubmittedProjectSettings())),
          (before, after) => expect(after).toBe(before),
        ),
        Command.expectNone(),
        expectNoOutMessage(),
        message(Message.UpdatedProjectName({ value: '   ' })),
        models(
          steps(message(Message.SubmittedProjectSettings())),
          (before, after) => expect(after).toBe(before),
        ),
        Command.expectNone(),
        expectNoOutMessage(),
      )
    },
  )

  it.effect(
    'keeps one pending save stable against duplicate submission, edits and discard',
    () => {
      const savedProject = modifyFields(project, {
        name: () => 'A new project name',
      })
      return story(
        projectSettingsSubject,
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
      )
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
      const savedProject = modifyFields(project, {
        name: () => 'A new project name',
      })

      return story(
        projectSettingsSubject,
        init(project),
        models(
          steps(message(Message.SucceededSaveProject({ project }))),
          (before, after) => expect(after).toBe(before),
        ),
        expectNoOutMessage(),
        message(Message.UpdatedProjectName({ value: savedProject.name })),
        message(Message.SubmittedProjectSettings()),
        models(
          steps(
            message(Message.SucceededSaveProject({ project: otherProject })),
          ),
          (before, after) => expect(after).toBe(before),
        ),
        expectNoOutMessage(),
        Command.expectExact(SaveProject({ project: savedProject })),
        Command.resolve(
          SaveProject,
          Message.SucceededSaveProject({ project: savedProject }),
        ),
      )
    },
  )

  it.effect(
    'normalizes a name in the saved payload and makes the saved values the next baseline',
    () => {
      const savedProject = modifyFields(project, { name: () => 'A new name' })
      return story(
        projectSettingsSubject,
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
      )
    },
  )
})
