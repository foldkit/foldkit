import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message as CounterMessage } from './counter'
import { Message, type Model, update } from './main'

const initialModel: Model = {
  rows: [
    { id: 'counter-0', counter: { count: 0 } },
    { id: 'counter-1', counter: { count: 0 } },
  ],
  nextRowId: 2,
}

describe('update', () => {
  test('ClickedAddRow appends a fresh Counter row with the next id', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedAddRow()),
      model(model => {
        expect(model.rows).toHaveLength(3)
        expect(model.rows[2]?.id).toBe('counter-2')
        expect(model.rows[2]?.counter.count).toBe(0)
        expect(model.nextRowId).toBe(3)
      }),
    )
  })

  test('ClickedRemoveRow drops only the targeted row', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRemoveRow({ id: 'counter-0' })),
      model(model => {
        expect(model.rows).toHaveLength(1)
        expect(model.rows[0]?.id).toBe('counter-1')
      }),
    )
  })

  test('GotCounterMessage routes ClickedIncrement to the matching row only', () => {
    story(
      update,
      given(initialModel),
      message(
        Message.GotCounterMessage({
          id: 'counter-1',
          message: CounterMessage.ClickedIncrement(),
        }),
      ),
      model(model => {
        expect(model.rows[0]?.counter.count).toBe(0)
        expect(model.rows[1]?.counter.count).toBe(1)
      }),
    )
  })

  test('GotCounterMessage routes ClickedDecrement to the matching row only', () => {
    story(
      update,
      given({
        rows: [
          { id: 'counter-0', counter: { count: 5 } },
          { id: 'counter-1', counter: { count: 5 } },
        ],
        nextRowId: 2,
      }),
      message(
        Message.GotCounterMessage({
          id: 'counter-0',
          message: CounterMessage.ClickedDecrement(),
        }),
      ),
      model(model => {
        expect(model.rows[0]?.counter.count).toBe(4)
        expect(model.rows[1]?.counter.count).toBe(5)
      }),
    )
  })

  test('GotCounterMessage for a missing id leaves the model unchanged', () => {
    story(
      update,
      given(initialModel),
      message(
        Message.GotCounterMessage({
          id: 'counter-99',
          message: CounterMessage.ClickedIncrement(),
        }),
      ),
      model(model => {
        expect(model.rows[0]?.counter.count).toBe(0)
        expect(model.rows[1]?.counter.count).toBe(0)
      }),
    )
  })

  test('successive Messages accumulate per row independently', () => {
    story(
      update,
      given(initialModel),
      message(
        Message.GotCounterMessage({
          id: 'counter-0',
          message: CounterMessage.ClickedIncrement(),
        }),
      ),
      message(
        Message.GotCounterMessage({
          id: 'counter-0',
          message: CounterMessage.ClickedIncrement(),
        }),
      ),
      message(
        Message.GotCounterMessage({
          id: 'counter-1',
          message: CounterMessage.ClickedDecrement(),
        }),
      ),
      model(model => {
        expect(model.rows[0]?.counter.count).toBe(2)
        expect(model.rows[1]?.counter.count).toBe(-1)
      }),
    )
  })
})
