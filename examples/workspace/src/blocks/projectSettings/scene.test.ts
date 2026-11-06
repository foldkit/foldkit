import { Array, Option } from 'effect'
import { Scene } from 'foldkit'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { ProjectSettingsBlock } from './block'
import { layer } from './layer'

it.effect('discard restores the last saved project fields', () => {
  const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
  return Scene.scene(
    { block: ProjectSettingsBlock, layer },
    Scene.init(project),
    Scene.type(Scene.label('Project name'), 'An unfinished name'),
    Scene.expect(Scene.role('button', { name: 'Save changes' })).toBeEnabled(),
    Scene.click(Scene.role('button', { name: 'Discard changes' })),
    Scene.expect(Scene.label('Project name')).toHaveValue(project.name),
    Scene.expect(Scene.role('button', { name: 'Save changes' })).toBeDisabled(),
  )
})
