import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { click, expect, label, role, scene, type } from 'foldkit/scene'

import { it } from '@effect/vitest'

import { initialWorkspace } from './domain/seed'
import {
  OutMessage,
  ProjectSettings,
  ProjectSettingsLive,
} from './projectSettings'
import { ApplicationLayer } from './services'

class ProjectSettingsScene extends Block<ProjectSettingsScene>()(
  'ProjectSettingsScene',
  {
    Model: Schema.Struct({ projectSettings: ProjectSettings }),
    OutMessage,
  },
) {}

const project = Option.getOrThrow(Array.head(initialWorkspace.projects))

const ProjectSettingsSceneLive = ProjectSettingsScene.make(
  Effect.fn(function* () {
    const projectSettings = yield* new ProjectSettings('projectSettings', {
      project,
    })

    return {
      model: { projectSettings },
      update: {
        ...projectSettings.on({
          Saved: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: (model, h) => h.div([], [model.projectSettings.view()]),
    }
  }),
).pipe(Layer.provide(ProjectSettingsLive))

it.effect('discard restores the last saved project fields', () =>
  scene(
    ProjectSettingsSceneLive,
    type(label('Project name'), 'An unfinished name'),
    expect(role('button', { name: 'Save changes' })).toBeEnabled(),
    click(role('button', { name: 'Discard changes' })),
    expect(label('Project name')).toHaveValue(project.name),
    expect(role('button', { name: 'Save changes' })).toBeDisabled(),
  ).pipe(Effect.provide(ApplicationLayer)),
)
