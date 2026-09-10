import {
  all,
  click,
  expect,
  expectAll,
  first,
  given,
  nth,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { type Model, update, view } from './main'

const initialModel: Model = {
  rows: [
    { id: 'counter-0', counter: { count: 0 } },
    { id: 'counter-1', counter: { count: 0 } },
  ],
  nextRowId: 2,
}

describe('view', () => {
  test('renders one Counter row per entry', () => {
    scene(
      { update, view },
      given(initialModel),
      expectAll(all.role('button', { name: '+' })).toHaveCount(2),
      expectAll(all.role('button', { name: '-' })).toHaveCount(2),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(2),
    )
  })

  test('clicking + on a Counter dispatches through h.submodel back to the right row', () => {
    scene(
      { update, view },
      given(initialModel),
      expectAll(all.text('0')).toHaveCount(2),
      click(nth(all.role('button', { name: '+' }), 1)),
      expect(text('0')).toExist(),
      expect(text('1')).toExist(),
    )
  })

  test('clicking - on a Counter dispatches through h.submodel and decrements', () => {
    scene(
      { update, view },
      given({
        rows: [{ id: 'counter-0', counter: { count: 3 } }],
        nextRowId: 1,
      }),
      expect(text('3')).toExist(),
      click(role('button', { name: '-' })),
      expect(text('2')).toExist(),
    )
  })

  test('Add Counter creates a new row with a fresh Counter', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: '+ Add Counter' })),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(3),
      expectAll(all.text('0')).toHaveCount(3),
    )
  })

  test('Remove deletes a row and routes future events to surviving rows', () => {
    scene(
      { update, view },
      given({
        rows: [
          { id: 'counter-0', counter: { count: 5 } },
          { id: 'counter-1', counter: { count: 10 } },
        ],
        nextRowId: 2,
      }),
      expect(text('5')).toExist(),
      expect(text('10')).toExist(),
      click(first(all.role('button', { name: 'Remove' }))),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(1),
      expect(text('5')).not.toExist(),
      expect(text('10')).toExist(),
      click(role('button', { name: '+' })),
      expect(text('11')).toExist(),
    )
  })
})
