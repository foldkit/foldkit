import { Scene } from 'foldkit'
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
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.role('button', { name: '+' })).toHaveCount(2),
      Scene.expectAll(Scene.all.role('button', { name: '-' })).toHaveCount(2),
      Scene.expectAll(Scene.all.role('button', { name: 'Remove' })).toHaveCount(
        2,
      ),
    )
  })

  test('clicking + on a Counter dispatches through h.submodel back to the right row', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expectAll(Scene.all.text('0')).toHaveCount(2),
      Scene.click(Scene.nth(Scene.all.role('button', { name: '+' }), 1)),
      Scene.expect(Scene.text('0')).toExist(),
      Scene.expect(Scene.text('1')).toExist(),
    )
  })

  test('clicking - on a Counter dispatches through h.submodel and decrements', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        rows: [{ id: 'counter-0', counter: { count: 3 } }],
        nextRowId: 1,
      }),
      Scene.expect(Scene.text('3')).toExist(),
      Scene.click(Scene.role('button', { name: '-' })),
      Scene.expect(Scene.text('2')).toExist(),
    )
  })

  test('Add Counter creates a new row with a fresh Counter', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: '+ Add Counter' })),
      Scene.expectAll(Scene.all.role('button', { name: 'Remove' })).toHaveCount(
        3,
      ),
      Scene.expectAll(Scene.all.text('0')).toHaveCount(3),
    )
  })

  test('Remove deletes a row and routes future events to surviving rows', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        rows: [
          { id: 'counter-0', counter: { count: 5 } },
          { id: 'counter-1', counter: { count: 10 } },
        ],
        nextRowId: 2,
      }),
      Scene.expect(Scene.text('5')).toExist(),
      Scene.expect(Scene.text('10')).toExist(),
      Scene.click(Scene.first(Scene.all.role('button', { name: 'Remove' }))),
      Scene.expectAll(Scene.all.role('button', { name: 'Remove' })).toHaveCount(
        1,
      ),
      Scene.expect(Scene.text('5')).not.toExist(),
      Scene.expect(Scene.text('10')).toExist(),
      Scene.click(Scene.role('button', { name: '+' })),
      Scene.expect(Scene.text('11')).toExist(),
    )
  })
})
