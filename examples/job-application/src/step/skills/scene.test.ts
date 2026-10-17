import { expect, given, label, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init } from './init'
import { update } from './update'
import { view } from './view'

describe('skills', () => {
  test('renders the first skill field and the add control', () => {
    scene(
      { update, view },
      given(init('skills-entry-1')),
      expect(label('Skill')).toExist(),
      expect(role('button', { name: '+ Add Skill' })).toExist(),
    )
  })
})
