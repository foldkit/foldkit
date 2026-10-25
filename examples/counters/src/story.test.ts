import { Array, Option } from 'effect'
import { given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import {
  CountersBinding,
  Message,
  Model as ModelSchema,
  init,
  update,
} from './application'
import { CounterBlock } from './counter'

const initialModel: typeof ModelSchema.Type = {
  counters: [
    { id: 'counter-0', counter: { count: 0 } },
    { id: 'counter-1', counter: { count: 0 } },
  ],
  nextCounterId: 2,
}

const counterMessage = (
  id: string,
  message: typeof CounterBlock.Message.Type,
) => toParentMessage(CountersBinding, id, message)

describe('init', () => {
  test('creates distinct parent-owned instances with Counter state', () => {
    const applicationInit = init()

    expect(applicationInit.model.counters).toEqual([
      { id: 'counter-0', counter: { count: 0 } },
      { id: 'counter-1', counter: { count: 0 } },
      { id: 'counter-2', counter: { count: 0 } },
    ])
    expect(applicationInit.model.nextCounterId).toBe(3)
  })
})

describe('update', () => {
  test('ClickedAddCounter appends a fresh Counter instance with the next id', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedAddCounter()),
      model(model => {
        expect(model.counters).toHaveLength(3)
        expect(Option.getOrThrow(Array.get(model.counters, 2)).id).toBe(
          'counter-2',
        )
        expect(
          Option.getOrThrow(Array.get(model.counters, 2)).counter.count,
        ).toBe(0)
        expect(model.nextCounterId).toBe(3)
      }),
    )
  })

  test('ClickedRemoveCounter drops only the targeted instance', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
      model(model => {
        expect(model.counters).toHaveLength(1)
        expect(Option.getOrThrow(Array.get(model.counters, 0)).id).toBe(
          'counter-1',
        )
      }),
    )
  })

  test('adding after deletions never duplicates or reuses a retired id', () => {
    story(
      update,
      given(initialModel),
      message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
      message(Message.ClickedAddCounter()),
      message(Message.ClickedRemoveCounter({ id: 'counter-2' })),
      message(Message.ClickedAddCounter()),
      message(
        counterMessage('counter-2', CounterBlock.Message.ClickedIncrement()),
      ),
      model(model => {
        expect(model.counters).toEqual([
          { id: 'counter-1', counter: { count: 0 } },
          { id: 'counter-3', counter: { count: 0 } },
        ])
        expect(model.nextCounterId).toBe(4)
      }),
    )
  })

  test('generated Counter Message routes ClickedIncrement to the matching instance only', () => {
    story(
      update,
      given(initialModel),
      message(
        counterMessage('counter-1', CounterBlock.Message.ClickedIncrement()),
      ),
      model(model => {
        expect(
          Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
        ).toBe(0)
        expect(
          Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
        ).toBe(1)
      }),
    )
  })

  test('generated Counter Message routes ClickedDecrement to the matching instance only', () => {
    story(
      update,
      given({
        counters: [
          { id: 'counter-0', counter: { count: 5 } },
          { id: 'counter-1', counter: { count: 5 } },
        ],
        nextCounterId: 2,
      }),
      message(
        counterMessage('counter-0', CounterBlock.Message.ClickedDecrement()),
      ),
      model(model => {
        expect(
          Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
        ).toBe(4)
        expect(
          Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
        ).toBe(5)
      }),
    )
  })

  test('generated Counter Message for a missing id leaves the model unchanged', () => {
    story(
      update,
      given(initialModel),
      message(
        counterMessage('counter-99', CounterBlock.Message.ClickedIncrement()),
      ),
      model(model => {
        expect(
          Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
        ).toBe(0)
        expect(
          Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
        ).toBe(0)
      }),
    )
  })

  test('successive Messages accumulate per instance independently', () => {
    story(
      update,
      given(initialModel),
      message(
        counterMessage('counter-0', CounterBlock.Message.ClickedIncrement()),
      ),
      message(
        counterMessage('counter-0', CounterBlock.Message.ClickedIncrement()),
      ),
      message(
        counterMessage('counter-1', CounterBlock.Message.ClickedDecrement()),
      ),
      model(model => {
        expect(
          Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
        ).toBe(2)
        expect(
          Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
        ).toBe(-1)
      }),
    )
  })
})
