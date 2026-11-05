import { Calendar } from 'foldkit'
import { init } from 'foldkit/scene'
import { expect, label, role, scene } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { WorkHistoryBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)

describe('workHistory', () => {
  it.effect('renders the first position fields and the add control', () =>
    scene(
      { block: WorkHistoryBlock, layer },
      init(today, 'work-history-entry-1'),
      expect(label('Company')).toExist(),
      expect(label('Job Title')).toExist(),
      expect(role('button', { name: '+ Add Position' })).toExist(),
    ),
  )
})
