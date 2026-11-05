import { init } from 'foldkit/scene'
import { expect, label, role, scene } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { SkillsBlock, layer } from './index'

describe('skills', () => {
  it.effect('renders the first skill field and the add control', () =>
    scene(
      { block: SkillsBlock, layer },
      init('skills-entry-1'),
      expect(label('Skill')).toExist(),
      expect(role('button', { name: '+ Add Skill' })).toExist(),
    ),
  )
})
