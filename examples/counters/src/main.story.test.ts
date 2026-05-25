import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { ClickedDecrement, ClickedIncrement } from './counter'
import {
  ClickedAddRow,
  ClickedRemoveRow,
  GotCounterMessage,
  type Model,
  update,
} from './main'

const initialModel: Model = {
  rows: [
    { id: 'counter-0', counter: { count: 0 } },
    { id: 'counter-1', counter: { count: 0 } },
  ],
  nextRowId: 2,
}

describe('update', () => {
  test('ClickedAddRow appends a fresh Counter row with the next id', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedAddRow()),
      Story.model(model => {
        expect(model.rows).toHaveLength(3)
        expect(model.rows[2]?.id).toBe('counter-2')
        expect(model.rows[2]?.counter.count).toBe(0)
        expect(model.nextRowId).toBe(3)
      }),
    )
  })

  test('ClickedRemoveRow drops only the targeted row', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(ClickedRemoveRow({ id: 'counter-0' })),
      Story.model(model => {
        expect(model.rows).toHaveLength(1)
        expect(model.rows[0]?.id).toBe('counter-1')
      }),
    )
  })

  test('GotCounterMessage routes ClickedIncrement to the matching row only', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(
        GotCounterMessage({
          id: 'counter-1',
          message: ClickedIncrement(),
        }),
      ),
      Story.model(model => {
        expect(model.rows[0]?.counter.count).toBe(0)
        expect(model.rows[1]?.counter.count).toBe(1)
      }),
    )
  })

  test('GotCounterMessage routes ClickedDecrement to the matching row only', () => {
    Story.story(
      update,
      Story.with({
        rows: [
          { id: 'counter-0', counter: { count: 5 } },
          { id: 'counter-1', counter: { count: 5 } },
        ],
        nextRowId: 2,
      }),
      Story.message(
        GotCounterMessage({
          id: 'counter-0',
          message: ClickedDecrement(),
        }),
      ),
      Story.model(model => {
        expect(model.rows[0]?.counter.count).toBe(4)
        expect(model.rows[1]?.counter.count).toBe(5)
      }),
    )
  })

  test('GotCounterMessage for a missing id leaves the model unchanged', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(
        GotCounterMessage({
          id: 'counter-99',
          message: ClickedIncrement(),
        }),
      ),
      Story.model(model => {
        expect(model.rows[0]?.counter.count).toBe(0)
        expect(model.rows[1]?.counter.count).toBe(0)
      }),
    )
  })

  test('successive Messages accumulate per row independently', () => {
    Story.story(
      update,
      Story.with(initialModel),
      Story.message(
        GotCounterMessage({
          id: 'counter-0',
          message: ClickedIncrement(),
        }),
      ),
      Story.message(
        GotCounterMessage({
          id: 'counter-0',
          message: ClickedIncrement(),
        }),
      ),
      Story.message(
        GotCounterMessage({
          id: 'counter-1',
          message: ClickedDecrement(),
        }),
      ),
      Story.model(model => {
        expect(model.rows[0]?.counter.count).toBe(2)
        expect(model.rows[1]?.counter.count).toBe(-1)
      }),
    )
  })
})
