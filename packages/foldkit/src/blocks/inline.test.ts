import { Context, Effect, Layer, Schema } from 'effect'

import { describe, expect, it } from '@effect/vitest'

import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { Command as StoryCommand, message, model } from '../test/story.js'
import { Block, deliver } from './block.js'
import { story } from './testing.js'

const CounterMessage = defineMessageUnion({ ClickedIncrement: {} })
const CounterOutMessage = defineMessageUnion({ ReachedMax: {} })

class Counter extends Block<Counter, { readonly max: number }>()(
  'Counter',
  {
    Model: Schema.Struct({ count: Schema.Number, max: Schema.Number }),
    Message: CounterMessage,
    OutMessage: CounterOutMessage,
  },
  () => ({
    init: ({ max }) => ({ count: 0, max }),
    update: {
      ClickedIncrement: model =>
        model.count + 1 === model.max
          ? {
              model: { ...model, count: model.max },
              outMessage: CounterOutMessage.ReachedMax(),
            }
          : { model: { ...model, count: model.count + 1 } },
    },
  }),
) {}

class Store extends Context.Service<
  Store,
  { readonly save: (count: number) => Effect.Effect<void> }
>()('Store') {}

const PanelMessage = defineMessageUnion({
  ClickedSave: {},
  CompletedSave: {},
})

const Save = Command.define('Save', {
  args: { count: Schema.Number },
  messages: [PanelMessage.CompletedSave],
})

const PanelModel = Schema.Struct({
  counter: Counter,
  reachedMax: Schema.Boolean,
})
type PanelModel = typeof PanelModel.Type

class Panel extends Block<Panel>()(
  'Panel',
  { Model: PanelModel, Message: PanelMessage, Command: [Save] },
  Effect.gen(function* () {
    const store = yield* Store
    return {
      init: () => ({
        counter: new Counter('counter', { max: 2 }),
        reachedMax: false,
      }),
      update: {
        ...Counter.on<PanelModel>({
          ReachedMax: model => ({ model: { ...model, reachedMax: true } }),
        }),
        ClickedSave: model => ({
          model,
          commands: [Save({ count: model.counter.model.count })],
        }),
        CompletedSave: model => ({ model }),
      },
      commands: {
        Save: ({ count }) =>
          store.save(count).pipe(Effect.as(PanelMessage.CompletedSave())),
      },
    }
  }),
) {}

const ShelfMessage = defineMessageUnion({ ClickedReset: {} })

class Shelf extends Block<Shelf>()(
  'Shelf',
  {
    Model: Schema.Struct({ counter: Counter, maxedCount: Schema.Number }),
    Message: ShelfMessage,
  },
  () => ({
    init: () => ({
      counter: new Counter('counter', { max: 1 }),
      maxedCount: 0,
    }),
    update: {
      ...Counter.on({
        ReachedMax: model => ({
          model: { ...model, maxedCount: model.maxedCount + 1 },
        }),
      }),
      ClickedReset: model => ({ model: { ...model, maxedCount: 0 } }),
    },
  }),
) {}

const StoreTest = Layer.succeed(Store, { save: () => Effect.void })

describe('Block with an inline implementation', () => {
  it.effect(
    'infers child OutMessage handlers in a module returned by a function',
    () =>
      story(
        Shelf.pipe(Layer.provide(Counter)),
        message(
          deliver(Counter, 'counter', Counter.Message.ClickedIncrement()),
        ),
        model(shelf => expect(shelf.maxedCount).toBe(1)),
      ),
  )

  it.effect('is its own Layer, provided to a parent like any Block Layer', () =>
    story(
      Panel.pipe(Layer.provide(Counter)),
      message(deliver(Counter, 'counter', Counter.Message.ClickedIncrement())),
      message(deliver(Counter, 'counter', Counter.Message.ClickedIncrement())),
      model(panel => expect(panel.reachedMax).toBe(true)),
      message(Panel.Message.ClickedSave()),
      StoryCommand.expectExact(Save({ count: 2 })),
      StoryCommand.resolve(Save, Panel.Message.CompletedSave()),
    ).pipe(Effect.provide(StoreTest)),
  )

  it.effect('runs as a story directly', () =>
    story(
      Counter,
      { max: 1 },
      message(Counter.Message.ClickedIncrement()),
      model(counter => expect(counter.count).toBe(1)),
    ),
  )

  it.effect('yields its implementation, which another Layer can wrap', () => {
    const LoggedCounterLive = Counter.toLayer(
      Effect.gen(function* () {
        const counter = yield* Counter
        return { ...counter, init: ({ max }) => ({ count: max - 1, max }) }
      }),
    ).pipe(Layer.provide(Counter))

    return story(
      LoggedCounterLive,
      { max: 3 },
      model(counter => expect(counter.count).toBe(2)),
    )
  })

  it.effect('is replaced by an alternative Layer', () =>
    story(
      Counter.toLayer(() => ({
        init: ({ max }) => ({ count: 100, max }),
        update: { ClickedIncrement: model => ({ model }) },
      })),
      { max: 3 },
      model(counter => expect(counter.count).toBe(100)),
    ),
  )
})

const BoardMessage = defineMessageUnion({
  ClickedReset: {},
  ClickedSave: {},
  CompletedSave: {},
})

const SaveBoard = Command.define('SaveBoard', {
  args: { total: Schema.Number },
  messages: [BoardMessage.CompletedSave],
})

class Board extends Block<Board, { readonly max: number }>()('Board', {
  Model: Schema.Struct({ counter: Counter, maxedCount: Schema.Number }),
  Message: BoardMessage,
  Command: [SaveBoard],
}) {}

const BoardLive = Board.toLayer(
  Effect.gen(function* () {
    const store = yield* Store
    return {
      init,
      update,
      commands: {
        SaveBoard: ({ total }) =>
          store.save(total).pipe(Effect.as(BoardMessage.CompletedSave())),
      },
    }
  }),
)

const init = Board.init(({ max }) => ({
  counter: new Counter('counter', { max }),
  maxedCount: 0,
}))

const resetStep = Board.step(model => ({
  model: { ...model, maxedCount: 0 },
}))

const update = Board.update({
  ...Counter.on({
    ReachedMax: model => ({
      model: { ...model, maxedCount: model.maxedCount + 1 },
    }),
  }),
  ClickedReset: resetStep,
  ClickedSave: model => ({
    model,
    commands: [SaveBoard({ total: model.maxedCount })],
  }),
  CompletedSave: model => ({ model }),
})

describe('Block authored at module scope', () => {
  it.effect('infers pieces written outside the Layer through the class', () =>
    story(
      BoardLive.pipe(Layer.provide(Counter)),
      { max: 1 },
      message(deliver(Counter, 'counter', Counter.Message.ClickedIncrement())),
      model(board => expect(board.maxedCount).toBe(1)),
      message(Board.Message.ClickedSave()),
      StoryCommand.expectExact(SaveBoard({ total: 1 })),
      StoryCommand.resolve(SaveBoard, Board.Message.CompletedSave()),
      message(Board.Message.ClickedReset()),
      model(board => expect(board.maxedCount).toBe(0)),
    ).pipe(Effect.provide(StoreTest)),
  )
})
