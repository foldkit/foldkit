import { Effect } from 'effect'
import { expect, label, role, scene } from 'foldkit/scene'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, it } from '@effect/vitest'

import { SkillsLive } from './skills'

describe('skills', () => {
  it.effect('renders the first skill field and the add control', () =>
    scene(
      SkillsLive,
      { initialEntryId: 'skills-entry-1' },
      expect(label('Skill')).toExist(),
      expect(role('button', { name: '+ Add Skill' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})
