import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Model } from './application'

const initialModel = Model.make({ count: 0 })

describe('view', () => {
  it.effect('renders the initial count and three buttons', () =>
    scene(
      ApplicationBlock,
      given(initialModel),
      expect(text('0')).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
      expect(role('button', { name: 'Reset' })).toExist(),
    ),
  )

  it.effect('clicking + increments the displayed count', () =>
    scene(
      ApplicationBlock,
      given(initialModel),
      click(role('button', { name: '+' })),
      expect(text('1')).toExist(),
      click(role('button', { name: '+' })),
      expect(text('2')).toExist(),
    ),
  )

  it.effect('clicking - decrements the displayed count', () =>
    scene(
      ApplicationBlock,
      given({ count: 3 }),
      click(role('button', { name: '-' })),
      expect(text('2')).toExist(),
    ),
  )

  it.effect('clicking - past zero produces a negative count', () =>
    scene(
      ApplicationBlock,
      given(initialModel),
      click(role('button', { name: '-' })),
      expect(text('-1')).toExist(),
    ),
  )

  it.effect('Reset returns the count to zero', () =>
    scene(
      ApplicationBlock,
      given({ count: 42 }),
      click(role('button', { name: 'Reset' })),
      expect(text('0')).toExist(),
    ),
  )
})
