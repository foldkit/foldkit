import { Array, Option } from 'effect'
import { Story } from 'foldkit'
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

const initialModel: ModelSchema = {
  counters: [
    CounterBlock.Instance.make({ key: 'counter-0', model: { count: 0 } }),
    CounterBlock.Instance.make({ key: 'counter-1', model: { count: 0 } }),
  ],
  nextCounterId: 2,
}

describe('init', () => {
  it.effect('creates distinct parent-owned instances with Counter state', () =>
    Story.story(
      { block: ApplicationBlock, layer },
      Story.init(),
      Story.model(applicationModel => {
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedAddCounter()),
        Story.model(model => {
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
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
      Story.model(model => {
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
        Story.message(Message.ClickedAddCounter()),
        Story.message(Message.ClickedRemoveCounter({ id: 'counter-2' })),
        Story.message(Message.ClickedAddCounter()),
        Story.messageIn(
          CountersBinding,
          'counter-2',
          CounterBlock.Message.ClickedIncrement(),
        ),
        Story.model(model => {
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.messageIn(
          CountersBinding,
          'counter-1',
          CounterBlock.Message.ClickedIncrement(),
        ),
        Story.model(model => {
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given({
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
        Story.messageIn(
          CountersBinding,
          'counter-0',
          CounterBlock.Message.ClickedDecrement(),
        ),
        Story.model(model => {
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
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.messageIn(
          CountersBinding,
          'counter-99',
          CounterBlock.Message.ClickedIncrement(),
        ),
        Story.model(model => {
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
    Story.story(
      { block: ApplicationBlock, layer },
      Story.given(initialModel),
      Story.messageIn(
        CountersBinding,
        'counter-0',
        CounterBlock.Message.ClickedIncrement(),
      ),
      Story.messageIn(
        CountersBinding,
        'counter-0',
        CounterBlock.Message.ClickedIncrement(),
      ),
      Story.messageIn(
        CountersBinding,
        'counter-1',
        CounterBlock.Message.ClickedDecrement(),
      ),
      Story.model(model => {
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
