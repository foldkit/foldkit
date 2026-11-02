import { Array, Effect, Option } from 'effect'
import { given, init, message, messageFrom, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  ApplicationBlock,
  CountersBinding,
  Message,
  Model as ModelSchema,
} from './application'
import { CounterBlock } from './counter'

type CounterMessage = typeof CounterBlock.Message.Type

const initialModel: ModelSchema = {
  counters: [
    { id: 'counter-0', counter: { count: 0 } },
    { id: 'counter-1', counter: { count: 0 } },
  ],
  nextCounterId: 2,
}

const counterMessage = (id: string, message: CounterMessage) =>
  messageFrom(CountersBinding, id, message)

describe('init', () => {
  test('creates distinct parent-owned instances with Counter state', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        init(),
        model(applicationModel => {
          expect(applicationModel.counters).toEqual([
            { id: 'counter-0', counter: { count: 0 } },
            { id: 'counter-1', counter: { count: 0 } },
            { id: 'counter-2', counter: { count: 0 } },
          ])
          expect(applicationModel.nextCounterId).toBe(3)
        }),
      ),
    )
  })
})

describe('update', () => {
  test('ClickedAddCounter appends a fresh Counter instance with the next id', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
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
      ),
    )
  })

  test('ClickedRemoveCounter drops only the targeted instance', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
        model(model => {
          expect(model.counters).toHaveLength(1)
          expect(Option.getOrThrow(Array.get(model.counters, 0)).id).toBe(
            'counter-1',
          )
        }),
      ),
    )
  })

  test('adding after deletions never duplicates or reuses a retired id', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
        message(Message.ClickedAddCounter()),
        message(Message.ClickedRemoveCounter({ id: 'counter-2' })),
        message(Message.ClickedAddCounter()),
        counterMessage('counter-2', CounterBlock.Message.ClickedIncrement()),
        model(model => {
          expect(model.counters).toEqual([
            { id: 'counter-1', counter: { count: 0 } },
            { id: 'counter-3', counter: { count: 0 } },
          ])
          expect(model.nextCounterId).toBe(4)
        }),
      ),
    )
  })

  test('generated Counter Message routes ClickedIncrement to the matching instance only', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        counterMessage('counter-1', CounterBlock.Message.ClickedIncrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
          ).toBe(0)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
          ).toBe(1)
        }),
      ),
    )
  })

  test('generated Counter Message routes ClickedDecrement to the matching instance only', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        given({
          counters: [
            { id: 'counter-0', counter: { count: 5 } },
            { id: 'counter-1', counter: { count: 5 } },
          ],
          nextCounterId: 2,
        }),
        counterMessage('counter-0', CounterBlock.Message.ClickedDecrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
          ).toBe(4)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
          ).toBe(5)
        }),
      ),
    )
  })

  test('generated Counter Message for a missing id leaves the model unchanged', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        counterMessage('counter-99', CounterBlock.Message.ClickedIncrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
          ).toBe(0)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
          ).toBe(0)
        }),
      ),
    )
  })

  test('successive Messages accumulate per instance independently', async () => {
    await Effect.runPromise(
      story(
        ApplicationBlock,
        given(initialModel),
        counterMessage('counter-0', CounterBlock.Message.ClickedIncrement()),
        counterMessage('counter-0', CounterBlock.Message.ClickedIncrement()),
        counterMessage('counter-1', CounterBlock.Message.ClickedDecrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).counter.count,
          ).toBe(2)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).counter.count,
          ).toBe(-1)
        }),
      ),
    )
  })
})
