import { Effect } from 'effect'
import { init } from 'foldkit/scene'
import { expect, label, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { SkillsBlock, layer } from './block'

describe('skills', () => {
  test('renders the first skill field and the add control', async () => {
    await Effect.runPromise(
      scene(
        SkillsBlock,
        init('skills-entry-1'),
        expect(label('Skill')).toExist(),
        expect(role('button', { name: '+ Add Skill' })).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
