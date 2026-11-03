import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { inMessage, init } from 'foldkit/scene'
import { expect, label, scene, text, type } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { PersonalInfoBlock, layer } from './block'
import { InMessage } from './definition'

const today = Calendar.make(2026, 4, 16)

describe('personalInfo', () => {
  it.effect('a parent request displays validation errors in the form', () =>
    scene(
      PersonalInfoBlock,
      init(today),
      inMessage(InMessage.RequestedRevealErrors()),
      expect(text('First name is required')).toExist(),
      expect(text('Last name is required')).toExist(),
      expect(text('Email is required')).toExist(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('renders the name and email fields', () =>
    scene(
      PersonalInfoBlock,
      init(today),
      expect(label('First Name')).toExist(),
      expect(label('Last Name')).toExist(),
      expect(label('Email')).toExist(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('a valid first name shows a checkmark', () =>
    scene(
      PersonalInfoBlock,
      init(today),
      type(label('First Name'), 'Jane'),
      expect(text('✓')).toExist(),
    ).pipe(Effect.provide(layer)),
  )

  it.effect('a short first name shows the length error', () =>
    scene(
      PersonalInfoBlock,
      init(today),
      type(label('First Name'), 'J'),
      expect(text('First name must be at least 2 characters')).toExist(),
    ).pipe(Effect.provide(layer)),
  )
})
