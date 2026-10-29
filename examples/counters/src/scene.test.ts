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

import { Model as ModelSchema, update, view } from './application'

const initialModel: ModelSchema = {
  counters: [
    { id: 'counter-0', counter: { count: 0 } },
    { id: 'counter-1', counter: { count: 0 } },
  ],
  nextCounterId: 2,
}

describe('view', () => {
  test('renders one Counter instance per entry', () => {
    scene(
      { update, view },
      given(initialModel),
      expectAll(all.role('button', { name: '+' })).toHaveCount(2),
      expectAll(all.role('button', { name: '-' })).toHaveCount(2),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(2),
    )
  })

  test('clicking + on a Counter dispatches through h.block back to the right instance', () => {
    scene(
      { update, view },
      given(initialModel),
      expectAll(all.text('0')).toHaveCount(2),
      click(nth(all.role('button', { name: '+' }), 1)),
      expect(text('0')).toExist(),
      expect(text('1')).toExist(),
    )
  })

  test('clicking - on a Counter dispatches through h.block and decrements', () => {
    scene(
      { update, view },
      given({
        counters: [{ id: 'counter-0', counter: { count: 3 } }],
        nextCounterId: 1,
      }),
      expect(text('3')).toExist(),
      click(role('button', { name: '-' })),
      expect(text('2')).toExist(),
    )
  })

  test('Add Counter creates a new instance with a fresh Counter', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: '+ Add Counter' })),
      expectAll(all.role('button', { name: 'Remove' })).toHaveCount(3),
      expectAll(all.text('0')).toHaveCount(3),
    )
  })

  test('Remove deletes an instance and routes future events to surviving counters', () => {
    scene(
      { update, view },
      given({
        counters: [
          { id: 'counter-0', counter: { count: 5 } },
          { id: 'counter-1', counter: { count: 10 } },
        ],
        nextCounterId: 2,
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
