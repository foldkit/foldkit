import {
  all,
  click,
  expect,
  expectAll,
  first,
  given,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init, update, view } from './main'

const initialModel = init().model

describe('view', () => {
  test('renders memoization controls and both submodel regions', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(text('View Memoization')).toExist(),
      expect(role('button', { name: 'Increment tick' })).toExist(),
      expect(role('button', { name: 'Increment counter' })).toExist(),
      expect(text('Counter state')).toExist(),
      expect(text('Deep list')).toExist(),
      expect(text('5 items')).toExist(),
      expect(text('Item 1')).toExist(),
    )
  })

  test('add item increases the list count', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Add item' })),
      expect(text('6 items')).toExist(),
    )
  })

  test('incrementing a row updates only that row value badge', () => {
    scene(
      { update, view },
      given(initialModel),
      click(first(all.role('button', { name: 'Increment' }))),
      expect(text('value 1')).toExist(),
      expectAll(all.text('value 0')).toHaveCount(4),
    )
  })
})
