import { Layer } from 'effect'
import { Block } from 'foldkit'
import { given, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { ApplicationLive, Message } from './application'
import { Counter, CounterLive } from './counter'

const TestLive = ApplicationLive.pipe(Layer.provide(CounterLive))

const counterMessage = (id: string, message: typeof Counter.Message.Type) =>
  Block.deliver(Counter, ['counters', id], message)

describe('init', () => {
  it.effect('creates distinct parent-owned instances with Counter state', () =>
    story(
      TestLive,
      model(model => {
        expect(model.counters).toEqual([
          { count: 0 },
          { count: 0 },
          { count: 0 },
        ])
        expect(model.nextCounterId).toBe(3)
      }),
    ),
  )
})

describe('update', () => {
  it.effect(
    'ClickedAddCounter appends a fresh Counter instance with the next id',
    () =>
      story(
        TestLive,
        message(Message.ClickedAddCounter()),
        message(
          counterMessage('counter-3', Counter.Message.ClickedIncrement()),
        ),
        model(model => {
          expect(model.counters).toEqual([
            { count: 0 },
            { count: 0 },
            { count: 0 },
            { count: 1 },
          ])
          expect(model.nextCounterId).toBe(4)
        }),
      ),
  )

  it.effect('ClickedRemoveCounter drops only the targeted instance', () =>
    story(
      TestLive,
      message(counterMessage('counter-1', Counter.Message.ClickedIncrement())),
      message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
      model(model => {
        expect(model.counters).toEqual([{ count: 1 }, { count: 0 }])
      }),
    ),
  )

  it.effect(
    'adding after deletions never duplicates or reuses a retired id',
    () =>
      story(
        TestLive,
        message(Message.ClickedRemoveCounter({ id: 'counter-0' })),
        message(Message.ClickedAddCounter()),
        message(Message.ClickedRemoveCounter({ id: 'counter-2' })),
        message(Message.ClickedAddCounter()),
        message(
          counterMessage('counter-2', Counter.Message.ClickedIncrement()),
        ),
        model(model => {
          expect(model.counters).toEqual([
            { count: 0 },
            { count: 0 },
            { count: 0 },
          ])
          expect(model.nextCounterId).toBe(5)
        }),
        message(
          counterMessage('counter-4', Counter.Message.ClickedIncrement()),
        ),
        model(model => {
          expect(model.counters).toEqual([
            { count: 0 },
            { count: 0 },
            { count: 1 },
          ])
        }),
      ),
  )

  it.effect(
    'Counter Message routes ClickedIncrement to the matching instance only',
    () =>
      story(
        TestLive,
        message(
          counterMessage('counter-1', Counter.Message.ClickedIncrement()),
        ),
        model(model => {
          expect(model.counters).toEqual([
            { count: 0 },
            { count: 1 },
            { count: 0 },
          ])
        }),
      ),
  )

  it.effect(
    'Counter Message routes ClickedDecrement to the matching instance only',
    () =>
      story(
        TestLive,
        given({
          counters: [{ count: 5 }, { count: 5 }, { count: 5 }],
          nextCounterId: 3,
        }),
        message(
          counterMessage('counter-0', Counter.Message.ClickedDecrement()),
        ),
        model(model => {
          expect(model.counters).toEqual([
            { count: 4 },
            { count: 5 },
            { count: 5 },
          ])
        }),
      ),
  )

  it.effect('Counter Message for a missing id leaves the model unchanged', () =>
    story(
      TestLive,
      message(counterMessage('counter-99', Counter.Message.ClickedIncrement())),
      model(model => {
        expect(model.counters).toEqual([
          { count: 0 },
          { count: 0 },
          { count: 0 },
        ])
      }),
    ),
  )

  it.effect('successive Messages accumulate per instance independently', () =>
    story(
      TestLive,
      message(counterMessage('counter-0', Counter.Message.ClickedIncrement())),
      message(counterMessage('counter-0', Counter.Message.ClickedIncrement())),
      message(counterMessage('counter-1', Counter.Message.ClickedDecrement())),
      model(model => {
        expect(model.counters).toEqual([
          { count: 2 },
          { count: -1 },
          { count: 0 },
        ])
      }),
    ),
  )
})
