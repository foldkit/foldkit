import { Array, Option } from 'effect'
import { given, init, message, messageFrom, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  ApplicationBlock,
  CountersBinding,
  Message,
  Model as ModelSchema,
  layer,
} from './block'
import { CounterBlock } from './blocks/counter'

type CounterMessage = typeof CounterBlock.Message.Type

const initialModel: ModelSchema = {
  counters: [
    CounterBlock.Instance.make({ key: 'counter-0', model: { count: 0 } }),
    CounterBlock.Instance.make({ key: 'counter-1', model: { count: 0 } }),
  ],
  nextCounterId: 2,
}

const counterMessage = (id: string, message: CounterMessage) =>
  messageFrom(CountersBinding, id, message)

describe('init', () => {
  it.effect('creates distinct parent-owned instances with Counter state', () =>
    story(
      { block: ApplicationBlock, layer },
      init(),
      model(applicationModel => {
        expect(applicationModel.counters).toEqual([
          { key: 'counter-0', model: { count: 0 } },
          { key: 'counter-1', model: { count: 0 } },
          { key: 'counter-2', model: { count: 0 } },
        ])
        expect(applicationModel.nextCounterId).toBe(3)
      }),
    ),
  )
})

describe('update', () => {
  it.effect(
    'ClickedAddCounter appends a fresh Counter instance with the next id',
    () =>
      story(
        { block: ApplicationBlock, layer },
        given(initialModel),
        message(Message.ClickedAddCounter()),
        model(model => {
          expect(model.counters).toHaveLength(3)
          expect(Option.getOrThrow(Array.get(model.counters, 2)).key).toBe(
            'counter-2',
          )
          expect(
            Option.getOrThrow(Array.get(model.counters, 2)).model.count,
          ).toBe(0)
          expect(model.nextCounterId).toBe(3)
        }),
      ),
  )

  it.effect('ClickedRemoveCounter drops only the targeted instance', () =>
    story(
      { block: ApplicationBlock, layer },
      given(initialModel),
      message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
      model(model => {
        expect(model.counters).toHaveLength(1)
        expect(Option.getOrThrow(Array.get(model.counters, 0)).key).toBe(
          'counter-1',
        )
      }),
    ),
  )

  it.effect(
    'adding after deletions never duplicates or reuses a retired id',
    () =>
      story(
        { block: ApplicationBlock, layer },
        given(initialModel),
        message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
        message(Message.ClickedAddCounter()),
        message(Message.ClickedRemoveCounter({ id: 'counter-2' })),
        message(Message.ClickedAddCounter()),
        counterMessage('counter-2', CounterBlock.Message.ClickedIncrement()),
        model(model => {
          expect(model.counters).toEqual([
            { key: 'counter-1', model: { count: 0 } },
            { key: 'counter-3', model: { count: 0 } },
          ])
          expect(model.nextCounterId).toBe(4)
        }),
      ),
  )

  it.effect(
    'generated Counter Message routes ClickedIncrement to the matching instance only',
    () =>
      story(
        { block: ApplicationBlock, layer },
        given(initialModel),
        counterMessage('counter-1', CounterBlock.Message.ClickedIncrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).model.count,
          ).toBe(0)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).model.count,
          ).toBe(1)
        }),
      ),
  )

  it.effect(
    'generated Counter Message routes ClickedDecrement to the matching instance only',
    () =>
      story(
        { block: ApplicationBlock, layer },
        given({
          counters: [
            CounterBlock.Instance.make({
              key: 'counter-0',
              model: { count: 5 },
            }),
            CounterBlock.Instance.make({
              key: 'counter-1',
              model: { count: 5 },
            }),
          ],
          nextCounterId: 2,
        }),
        counterMessage('counter-0', CounterBlock.Message.ClickedDecrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).model.count,
          ).toBe(4)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).model.count,
          ).toBe(5)
        }),
      ),
  )

  it.effect(
    'generated Counter Message for a missing id leaves the model unchanged',
    () =>
      story(
        { block: ApplicationBlock, layer },
        given(initialModel),
        counterMessage('counter-99', CounterBlock.Message.ClickedIncrement()),
        model(model => {
          expect(
            Option.getOrThrow(Array.get(model.counters, 0)).model.count,
          ).toBe(0)
          expect(
            Option.getOrThrow(Array.get(model.counters, 1)).model.count,
          ).toBe(0)
        }),
      ),
  )

  it.effect('successive Messages accumulate per instance independently', () =>
    story(
      { block: ApplicationBlock, layer },
      given(initialModel),
      counterMessage('counter-0', CounterBlock.Message.ClickedIncrement()),
      counterMessage('counter-0', CounterBlock.Message.ClickedIncrement()),
      counterMessage('counter-1', CounterBlock.Message.ClickedDecrement()),
      model(model => {
        expect(
          Option.getOrThrow(Array.get(model.counters, 0)).model.count,
        ).toBe(2)
        expect(
          Option.getOrThrow(Array.get(model.counters, 1)).model.count,
        ).toBe(-1)
      }),
    ),
  )
})
