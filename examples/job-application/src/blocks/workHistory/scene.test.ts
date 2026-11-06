import { Calendar, Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { WorkHistoryBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)

describe('workHistory', () => {
  it.effect('renders the first position fields and the add control', () =>
    Scene.scene(
      { block: WorkHistoryBlock, layer },
      Scene.init(today, 'work-history-entry-1'),
      Scene.expect(Scene.label('Company')).toExist(),
      Scene.expect(Scene.label('Job Title')).toExist(),
      Scene.expect(Scene.role('button', { name: '+ Add Position' })).toExist(),
    ),
  )
})
