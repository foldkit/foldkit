import { Array, Context, Effect, Layer, Number, Option, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import {
  Command as SceneCommand,
  click,
  role,
  expect as sceneExpect,
  text,
} from '../test/scene.js'
import {
  Command as StoryCommand,
  expectOutMessage,
  message,
  model,
} from '../test/story.js'
import { Block, deliver } from './block.js'
import { scene, story } from './testing.js'

class CountStore extends Context.Service<
  CountStore,
  {
    readonly save: (id: string, count: number) => Effect.Effect<void, Error>
  }
>()('CountStore') {}

const CountStoreTest = Layer.succeed(CountStore, {
  save: () => Effect.void,
})

const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  ClickedSave: {},
  RequestedReset: {},
  SucceededSaveCount: {},
  FailedSaveCount: { reason: Schema.String },
})

const SaveCount = Command.define('SaveCount', {
  args: { count: Schema.Number },
  messages: [CounterMessage.SucceededSaveCount, CounterMessage.FailedSaveCount],
})

class Counter extends Block<Counter, { readonly max: number }>()('Counter', {
  Model: Schema.Struct({
    count: Schema.Number,
    maybeError: Schema.Option(Schema.String),
  }),
  Message: CounterMessage,
  OutMessage: defineMessageUnion({ ReachedMax: {} }),
  Command: [SaveCount],
}) {}

const CounterLive = Counter.make(
  Effect.fn(function* (id, { max }) {
    const store = yield* CountStore

    return {
      model: { count: 0, maybeError: Option.none() },
      update: {
        ClickedIncrement: model => {
          const nextCount = Number.increment(model.count)
          return nextCount === max
            ? {
                model: { ...model, count: nextCount },
                outMessage: Counter.OutMessage.ReachedMax(),
              }
            : { model: { ...model, count: nextCount } }
        },
        ClickedSave: model => ({
          model,
          commands: [SaveCount({ count: model.count })],
        }),
        RequestedReset: model => ({ model: { ...model, count: 0 } }),
        SucceededSaveCount: model => ({
          model: { ...model, maybeError: Option.none() },
        }),
        FailedSaveCount: (model, { reason }) => ({
          model: { ...model, maybeError: Option.some(reason) },
        }),
      },
      commands: {
        SaveCount: Effect.fn(
          function* ({ count }) {
            yield* store.save(id, count)
            return Counter.Message.SucceededSaveCount()
          },
          Effect.catch(error =>
            Effect.succeed(
              Counter.Message.FailedSaveCount({ reason: String(error) }),
            ),
          ),
        ),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.OnClick(Counter.Message.ClickedIncrement())],
              [`${id}: ${model.count}/${max}`],
            ),
            h.button(
              [h.OnClick(Counter.Message.ClickedSave())],
              [`Save ${id}`],
            ),
            ...Option.toArray(
              Option.map(model.maybeError, reason =>
                h.p([], [`Save failed: ${reason}`]),
              ),
            ),
          ],
        ),
    }
  }),
)

class LinkedCounters extends Block<LinkedCounters>()('LinkedCounters', {
  Model: Schema.Struct({ left: Counter, right: Counter }),
}) {}

const LinkedCountersLive = LinkedCounters.make(
  Effect.fn(function* () {
    const left = yield* new Counter('left', { max: 10 })
    const right = yield* new Counter('right', { max: 3 })

    return {
      model: { left, right },
      update: {
        ...left.on({
          ReachedMax: model => ({
            model,
            messages: [model.right.send(Counter.Message.RequestedReset())],
          }),
        }),
      },
      view: (model, h) => h.div([], [model.left.view(), model.right.view()]),
    }
  }),
)

class CounterList extends Block<CounterList>()('CounterList', {
  Model: Schema.Struct({
    rows: Schema.Array(Counter),
    nextRowId: Schema.Number,
  }),
  Message: defineMessageUnion({
    ClickedAddRow: {},
    ClickedRemoveRow: { id: Schema.String },
  }),
}) {}

const CounterListLive = CounterList.make(
  Effect.fn(function* () {
    const row = yield* Counter.each('rows', { max: 2 })

    return {
      model: { rows: [], nextRowId: 0 },
      update: {
        ClickedAddRow: model => ({
          model: {
            rows: Array.append(model.rows, row(`row-${model.nextRowId}`)),
            nextRowId: model.nextRowId + 1,
          },
        }),
        ClickedRemoveRow: (model, { id }) => ({
          model: {
            ...model,
            rows: Array.filter(model.rows, counter => counter.id !== id),
          },
        }),
        ...row.on({
          ReachedMax: (model, _, counter) => ({
            model: {
              ...model,
              rows: Array.filter(model.rows, ({ id }) => id !== counter.id),
            },
          }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            ...Array.map(model.rows, counter => counter.view()),
            h.button([h.OnClick(CounterList.Message.ClickedAddRow())], ['Add']),
          ],
        ),
    }
  }),
)

describe('Block', () => {
  it.effect('updates a leaf Block and reports its OutMessage', () =>
    story(
      CounterLive,
      { max: 2 },
      message(Counter.Message.ClickedIncrement()),
      model(model => expect(model.count).toBe(1)),
      message(Counter.Message.ClickedIncrement()),
      expectOutMessage(Counter.OutMessage.ReachedMax()),
    ).pipe(Effect.provide(CountStoreTest)),
  )

  it.effect('returns Commands as values and applies their results', () =>
    story(
      CounterLive,
      { max: 3 },
      message(Counter.Message.ClickedSave()),
      StoryCommand.expectExact(SaveCount),
      StoryCommand.resolve(
        SaveCount,
        Counter.Message.FailedSaveCount({ reason: 'offline' }),
      ),
      model(model => expect(model.maybeError).toEqual(Option.some('offline'))),
    ).pipe(Effect.provide(CountStoreTest)),
  )

  it.effect('routes child Messages and handles OutMessages in the parent', () =>
    story(
      LinkedCountersLive.pipe(Layer.provide(CounterLive)),
      model(model => {
        expect(model.left.count).toBe(0)
      }),
      message(deliver(Counter, 'right', Counter.Message.ClickedIncrement())),
      message(deliver(Counter, 'left', Counter.Message.ClickedIncrement())),
      model(model => {
        expect(model.left.count).toBe(1)
        expect(model.right.count).toBe(1)
      }),
    ).pipe(Effect.provide(CountStoreTest)),
  )

  it.effect('sends a Message to a sibling through the parent', () =>
    story(
      LinkedCountersLive.pipe(Layer.provide(CounterLive)),
      message(deliver(Counter, 'right', Counter.Message.ClickedIncrement())),
      ...globalThis.Array.from({ length: 10 }, () =>
        message(deliver(Counter, 'left', Counter.Message.ClickedIncrement())),
      ),
      model(model => {
        expect(model.left.count).toBe(10)
        expect(model.right.count).toBe(0)
      }),
    ).pipe(Effect.provide(CountStoreTest)),
  )

  it.effect('resolves a child Command through its ancestors', () =>
    story(
      LinkedCountersLive.pipe(Layer.provide(CounterLive)),
      message(deliver(Counter, 'left', Counter.Message.ClickedSave())),
      StoryCommand.expectExact(SaveCount),
      StoryCommand.resolve(
        SaveCount,
        Counter.Message.FailedSaveCount({ reason: 'offline' }),
      ),
      model(model => {
        expect(model.left.maybeError).toEqual(Option.some('offline'))
        expect(model.right.maybeError).toEqual(Option.none())
      }),
    ).pipe(Effect.provide(CountStoreTest)),
  )

  it.effect('creates, routes to, and removes keyed instances', () =>
    story(
      CounterListLive.pipe(Layer.provide(CounterLive)),
      message(CounterList.Message.ClickedAddRow()),
      message(CounterList.Message.ClickedAddRow()),
      message(
        deliver(Counter, ['rows', 'row-1'], Counter.Message.ClickedIncrement()),
      ),
      model(model => {
        expect(model.rows).toEqual([
          { count: 0, maybeError: Option.none() },
          { count: 1, maybeError: Option.none() },
        ])
      }),
      message(
        deliver(Counter, ['rows', 'row-1'], Counter.Message.ClickedIncrement()),
      ),
      model(model => expect(model.rows).toHaveLength(1)),
      message(CounterList.Message.ClickedRemoveRow({ id: 'row-0' })),
      model(model => expect(model.rows).toEqual([])),
    ).pipe(Effect.provide(CountStoreTest)),
  )

  it.effect('renders children and routes their clicks in a Scene', () =>
    scene(
      LinkedCountersLive.pipe(Layer.provide(CounterLive)),
      click(role('button', { name: 'left: 0/10' })),
      sceneExpect(role('button', { name: 'left: 1/10' })).toExist(),
      sceneExpect(role('button', { name: 'right: 0/3' })).toExist(),
      click(role('button', { name: 'Save right' })),
      SceneCommand.resolve(
        SaveCount,
        Counter.Message.FailedSaveCount({ reason: 'offline' }),
      ),
      sceneExpect(text('Save failed: offline')).toExist(),
    ).pipe(Effect.provide(CountStoreTest)),
  )
})
