import { Calendar, Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { InMessage } from './block'
import { PersonalInfoBlock, layer } from './index'

const today = Calendar.make(2026, 4, 16)

describe('personalInfo', () => {
  it.effect('a parent request displays validation errors in the form', () =>
    Scene.scene(
      { block: PersonalInfoBlock, layer },
      Scene.init(today),
      Scene.inMessage(InMessage.RequestedRevealErrors()),
      Scene.expect(Scene.text('First name is required')).toExist(),
      Scene.expect(Scene.text('Last name is required')).toExist(),
      Scene.expect(Scene.text('Email is required')).toExist(),
    ),
  )

  it.effect('renders the name and email fields', () =>
    Scene.scene(
      { block: PersonalInfoBlock, layer },
      Scene.init(today),
      Scene.expect(Scene.label('First Name')).toExist(),
      Scene.expect(Scene.label('Last Name')).toExist(),
      Scene.expect(Scene.label('Email')).toExist(),
    ),
  )

  it.effect('a valid first name shows a checkmark', () =>
    Scene.scene(
      { block: PersonalInfoBlock, layer },
      Scene.init(today),
      Scene.type(Scene.label('First Name'), 'Jane'),
      Scene.expect(Scene.text('✓')).toExist(),
    ),
  )

  it.effect('a short first name shows the length error', () =>
    Scene.scene(
      { block: PersonalInfoBlock, layer },
      Scene.init(today),
      Scene.type(Scene.label('First Name'), 'J'),
      Scene.expect(
        Scene.text('First name must be at least 2 characters'),
      ).toExist(),
    ),
  )
})
