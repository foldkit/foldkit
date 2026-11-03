import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { init } from 'foldkit/scene'
import { expect, label, role, scene } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { EducationBlock, layer } from './block'

const today = Calendar.make(2026, 4, 16)

describe('education', () => {
  it.effect('renders the first school fields and the add control', () =>
    scene(
      EducationBlock,
      init(today, 'education-entry-1'),
      expect(label('School')).toExist(),
      expect(label('Degree')).toExist(),
      expect(role('button', { name: '+ Add Education' })).toExist(),
    ).pipe(Effect.provide(layer)),
  )
})
