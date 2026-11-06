import { Calendar, Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { EducationBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)

describe('education', () => {
  it.effect('renders the first school fields and the add control', () =>
    Scene.scene(
      { block: EducationBlock, layer },
      Scene.init(today, 'education-entry-1'),
      Scene.expect(Scene.label('School')).toExist(),
      Scene.expect(Scene.label('Degree')).toExist(),
      Scene.expect(Scene.role('button', { name: '+ Add Education' })).toExist(),
    ),
  )
})
