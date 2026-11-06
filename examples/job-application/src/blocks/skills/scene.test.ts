import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { SkillsBlock, layer } from './index'

describe('skills', () => {
  it.effect('renders the first skill field and the add control', () =>
    Scene.scene(
      { block: SkillsBlock, layer },
      Scene.init('skills-entry-1'),
      Scene.expect(Scene.label('Skill')).toExist(),
      Scene.expect(Scene.role('button', { name: '+ Add Skill' })).toExist(),
    ),
  )
})
