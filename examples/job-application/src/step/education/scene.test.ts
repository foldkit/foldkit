import { Calendar } from 'foldkit'
import { expect, given, label, role, scene } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init, update } from './education'
import { view } from './view'

const today = Calendar.make(2026, 4, 16)

describe('education', () => {
  test('renders the first school fields and the add control', () => {
    scene(
      { update, view },
      given(init(today, 'education-entry-1')),
      expect(label('School')).toExist(),
      expect(label('Degree')).toExist(),
      expect(role('button', { name: '+ Add Education' })).toExist(),
    )
  })
})
