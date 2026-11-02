import { click, expect, given, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { ApplicationLive } from './application'

describe('view', () => {
  it.effect('renders the initial count and three buttons', () =>
    scene(
      ApplicationLive,
      expect(text('0')).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
      expect(role('button', { name: 'Reset' })).toExist(),
    ),
  )

  it.effect('clicking + increments the displayed count', () =>
    scene(
      ApplicationLive,
      click(role('button', { name: '+' })),
      expect(text('1')).toExist(),
      click(role('button', { name: '+' })),
      expect(text('2')).toExist(),
    ),
  )

  it.effect('clicking - decrements the displayed count', () =>
    scene(
      ApplicationLive,
      given({ count: 3 }),
      click(role('button', { name: '-' })),
      expect(text('2')).toExist(),
    ),
  )

  it.effect('clicking - past zero produces a negative count', () =>
    scene(
      ApplicationLive,
      click(role('button', { name: '-' })),
      expect(text('-1')).toExist(),
    ),
  )

  it.effect('Reset returns the count to zero', () =>
    scene(
      ApplicationLive,
      given({ count: 42 }),
      click(role('button', { name: 'Reset' })),
      expect(text('0')).toExist(),
    ),
  )
})
