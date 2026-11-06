import { Array, Option } from 'effect'
import { Story } from 'foldkit'
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
      return Story.story(
        projectSettingsSubject,
        Story.init(project),
        Story.models(
          Story.steps(Story.message(Message.SubmittedProjectSettings())),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectNone(),
        Story.expectNoOutMessage(),
        Story.message(
          Message.UpdatedProjectName({ value: ` ${project.name} ` }),
        ),
        Story.models(
          Story.steps(Story.message(Message.SubmittedProjectSettings())),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectNone(),
        Story.expectNoOutMessage(),
        Story.message(Message.UpdatedProjectName({ value: '   ' })),
        Story.models(
          Story.steps(Story.message(Message.SubmittedProjectSettings())),
          (before, after) => expect(after).toBe(before),
        ),
        Story.Command.expectNone(),
        Story.expectNoOutMessage(),
      )
    },
  )

  it.effect(
    'keeps one pending save stable against duplicate submission, edits and discard',
    () => {
      const savedProject = modifyFields(project, {
        name: () => 'A new project name',
      })
      return Story.story(
        projectSettingsSubject,
        Story.init(project),
        Story.message(Message.UpdatedProjectName({ value: savedProject.name })),
        Story.message(Message.SubmittedProjectSettings()),
        Story.Command.expectExact(SaveProject({ project: savedProject })),
        Story.message(
          Message.UpdatedProjectName({ value: 'An edit during save' }),
        ),
        Story.message(
          Message.UpdatedProjectDescription({ value: 'Another edit' }),
        ),
        Story.message(Message.ClickedDiscardChanges()),
        Story.message(Message.SubmittedProjectSettings()),
        Story.message(Message.ClickedRetrySave()),
        Story.model(model => {
          expect(model.draft).toEqual({
            name: savedProject.name,
            description: savedProject.description,
          })
          expect(model.saveState).toEqual(SaveState.Saving())
        }),
        Story.Command.expectExact(SaveProject({ project: savedProject })),
        Story.expectNoOutMessage(),
        Story.Command.resolve(
          SaveProject,
          Message.SucceededSaveProject({ project: savedProject }),
        ),
        Story.expectOutMessage(OutMessage.Saved({ project: savedProject })),
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

      return Story.story(
        projectSettingsSubject,
        Story.init(project),
        Story.models(
          Story.steps(Story.message(Message.SucceededSaveProject({ project }))),
          (before, after) => expect(after).toBe(before),
        ),
        Story.expectNoOutMessage(),
        Story.message(Message.UpdatedProjectName({ value: savedProject.name })),
        Story.message(Message.SubmittedProjectSettings()),
        Story.models(
          Story.steps(
            Story.message(
              Message.SucceededSaveProject({ project: otherProject }),
            ),
          ),
          (before, after) => expect(after).toBe(before),
        ),
        Story.expectNoOutMessage(),
        Story.Command.expectExact(SaveProject({ project: savedProject })),
        Story.Command.resolve(
          SaveProject,
          Message.SucceededSaveProject({ project: savedProject }),
        ),
      )
    },
  )

  it.effect(
    'normalizes a name in the saved payload and uses the saved values as the new draft baseline',
    () => {
      const savedProject = modifyFields(project, { name: () => 'A new name' })
      return Story.story(
        projectSettingsSubject,
        Story.init(project),
        Story.message(Message.UpdatedProjectName({ value: ' A new name ' })),
        Story.message(Message.SubmittedProjectSettings()),
        Story.Command.expectExact(SaveProject({ project: savedProject })),
        Story.Command.resolve(
          SaveProject,
          Message.SucceededSaveProject({ project: savedProject }),
        ),
        Story.expectOutMessage(OutMessage.Saved({ project: savedProject })),
        Story.model(model => {
          expect(model.savedProject).toEqual(savedProject)
          expect(model.draft.name).toBe(savedProject.name)
        }),
      )
    },
  )
})
