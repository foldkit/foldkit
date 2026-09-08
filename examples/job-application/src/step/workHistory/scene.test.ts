import { Calendar } from 'foldkit'
import { expect, given, label, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { view } from './view'
import { init, update } from './workHistory'

const today = Calendar.make(2026, 4, 16)

describe('workHistory', () => {
  test('renders the first position fields and the add control', () => {
    scene(
      { update, view },
      given(init(today, 'work-history-entry-1')),
      expect(label('Company')).toExist(),
      expect(label('Job Title')).toExist(),
      expect(role('button', { name: '+ Add Position' })).toExist(),
    )
  })
})
