import { Array, Option } from 'effect'
import { click, expect, init, label, role, scene, type } from 'foldkit/scene'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../domain'
import { layer } from './block'
import { ProjectSettingsBlock } from './definition'

it.effect('discard restores the last saved project fields', () => {
  const project = Option.getOrThrow(Array.head(initialWorkspace.projects))
  return scene(
    { block: ProjectSettingsBlock, layer },
    init(project),
    type(label('Project name'), 'An unfinished name'),
    expect(role('button', { name: 'Save changes' })).toBeEnabled(),
    click(role('button', { name: 'Discard changes' })),
    expect(label('Project name')).toHaveValue(project.name),
    expect(role('button', { name: 'Save changes' })).toBeDisabled(),
  )
})
