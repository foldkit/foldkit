import { Calendar } from 'foldkit'
import { expect, label, scene, text, type } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { PersonalInfoLive } from './personalInfo'

const args = { today: Calendar.make(2026, 4, 16) }

describe('personalInfo', () => {
  it.effect('renders the name and email fields', () =>
    scene(
      PersonalInfoLive,
      args,
      expect(label('First Name')).toExist(),
      expect(label('Last Name')).toExist(),
      expect(label('Email')).toExist(),
    ),
  )

  it.effect('a valid first name shows a checkmark', () =>
    scene(
      PersonalInfoLive,
      args,
      type(label('First Name'), 'Jane'),
      expect(text('✓')).toExist(),
    ),
  )

  it.effect('a short first name shows the length error', () =>
    scene(
      PersonalInfoLive,
      args,
      type(label('First Name'), 'J'),
      expect(text('First name must be at least 2 characters')).toExist(),
    ),
  )
})
