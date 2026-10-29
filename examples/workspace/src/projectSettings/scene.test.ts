import { Array, Option } from 'effect'
import { click, expect, given, label, role, scene, type } from 'foldkit/scene'
import { test } from 'vitest'

import { initialWorkspace } from '../domain'
import { init } from './init'
import { update } from './update'
import { view } from './view'

test('discard restores the last saved project fields', () => {
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
})
