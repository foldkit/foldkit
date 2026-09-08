import { click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const initialModel: Model = { count: 0 }

describe('view', () => {
  test('renders the initial count and three buttons', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(text('0')).toExist(),
      expect(role('button', { name: '+' })).toExist(),
      expect(role('button', { name: '-' })).toExist(),
      expect(role('button', { name: 'Reset' })).toExist(),
    )
  })

  test('clicking + increments the displayed count', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: '+' })),
      expect(text('1')).toExist(),
      click(role('button', { name: '+' })),
      expect(text('2')).toExist(),
    )
  })

  test('clicking - decrements the displayed count', () => {
    scene(
      { update, view },
      given({ count: 3 }),
      click(role('button', { name: '-' })),
      expect(text('2')).toExist(),
    )
  })

  test('clicking - past zero produces a negative count', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: '-' })),
      expect(text('-1')).toExist(),
    )
  })

  test('Reset returns the count to zero', () => {
    scene(
      { update, view },
      given({ count: 42 }),
      click(role('button', { name: 'Reset' })),
      expect(text('0')).toExist(),
    )
  })
})
