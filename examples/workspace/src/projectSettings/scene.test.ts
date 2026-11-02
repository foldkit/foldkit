import { Array, Effect, Option } from 'effect'
import { click, expect, given, label, role, scene, type } from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { test } from 'vitest'

import { initialWorkspace } from '../domain'
import { layer } from './block'
import { ProjectSettingsBlock } from './definition'

test('discard restores the last saved project fields', () => {
  return Effect.runPromise(
    Story.withBlock(ProjectSettingsBlock, executable => {
      const init = executable.init
      const update = executable.update
      const view = executable.view

      const project = Option.getOrThrow(Array.head(initialWorkspace.projects))

      scene(
        { update, view },
        given(init(project).model),
        type(label('Project name'), 'An unfinished name'),
        expect(role('button', { name: 'Save changes' })).toBeEnabled(),
        click(role('button', { name: 'Discard changes' })),
        expect(label('Project name')).toHaveValue(project.name),
        expect(role('button', { name: 'Save changes' })).toBeDisabled(),
      )
    }).pipe(Effect.provide(layer)),
  )
})
