import { Calendar } from 'foldkit'
import { expect, given, label, scene, text, type } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init, update } from './personalInfo'
import { view } from './view'

const today = Calendar.make(2026, 4, 16)

describe('personalInfo', () => {
  test('renders the name and email fields', () => {
    scene(
      { update, view },
      given(init(today)),
      expect(label('First Name')).toExist(),
      expect(label('Last Name')).toExist(),
      expect(label('Email')).toExist(),
    )
  })

  test('a valid first name shows a checkmark', () => {
    scene(
      { update, view },
      given(init(today)),
      type(label('First Name'), 'Jane'),
      expect(text('✓')).toExist(),
    )
  })

  test('a short first name shows the length error', () => {
    scene(
      { update, view },
      given(init(today)),
      type(label('First Name'), 'J'),
      expect(text('First name must be at least 2 characters')).toExist(),
    )
  })
})
