import { Array, Context, Effect, Number, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class CountStore extends Context.Service<
  CountStore,
  Readonly<{
    save: (counterId: string, count: number) => Effect.Effect<void, Error>
  }>
>()('CountStore') {}

const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  ClickedSave: {},
  CompletedSaveCount: {},
})

// The handler is shared by every Counter, so the id travels as an arg.
const SaveCount = Command.define('SaveCount', {
  args: { counterId: Schema.String, count: Schema.Number },
  messages: [CounterMessage.CompletedSaveCount],
})

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  {
    Model: Schema.Struct({
      counterId: Schema.String,
      max: Schema.Number,
      count: Schema.Number,
    }),
    Message: CounterMessage,
    OutMessage: defineMessageUnion({ ReachedMax: {} }),
    Command: [SaveCount],
  },
) {}

export const CounterLive = Counter.toLayer(
  Effect.gen(function* () {
    const countStore = yield* CountStore

    return {
      // Values the old constructor closed over move into the Model.
      init: ({ max }, { id }) => ({ counterId: id, max, count: 0 }),

      update: {
        ClickedIncrement: model => {
          const nextModel = modifyFields(model, { count: Number.increment })

          if (nextModel.count === model.max) {
            return {
              model: nextModel,
              outMessage: Counter.OutMessage.ReachedMax(),
            }
          } else {
            return { model: nextModel }
          }
        },
        ClickedSave: model => ({
          model,
          commands: [
            SaveCount({ counterId: model.counterId, count: model.count }),
          ],
        }),
        CompletedSaveCount: model => ({ model }),
      },

      commands: {
        SaveCount: ({ counterId, count }) =>
          countStore
            .save(counterId, count)
            .pipe(
              Effect.ignore,
              Effect.as(Counter.Message.CompletedSaveCount()),
            ),
      },

      view: (model, h) =>
        h.button(
          [h.OnClick(Counter.Message.ClickedIncrement())],
          [`${model.counterId}: ${model.count}/${model.max}`],
        ),
    }
  }),
)

const Message = defineMessageUnion({ ClickedAddRow: {} })

export class Board extends Block<Board>()('Board', {
  Model: Schema.Struct({
    pinned: Counter,
    rows: Schema.Array(Counter),
    nextRowId: Schema.Number,
    completedCount: Schema.Number,
  }),
  Message,
}) {}

export const BoardLive = Board.toLayer(() => ({
  init: () => ({
    pinned: new Counter('pinned', { max: 10 }),
    rows: [],
    nextRowId: 0,
    completedCount: 0,
  }),

  update: {
    ClickedAddRow: model => ({
      model: modifyFields(model, {
        rows: Array.append(new Counter(`row-${model.nextRowId}`, { max: 3 })),
        nextRowId: Number.increment,
      }),
    }),
    // One entry for every Counter in the Model. Branch on the instance.
    ...Counter.on({
      ReachedMax: (model, _outMessage, counter) => {
        if (counter.id === model.pinned.id) {
          return {
            model: modifyFields(model, {
              completedCount: Number.increment,
            }),
          }
        } else {
          return {
            model: modifyFields(model, {
              rows: Array.filter(({ id }) => id !== counter.id),
            }),
          }
        }
      },
    }),
  },

  view: (model, h) =>
    h.div(
      [],
      [
        model.pinned.view(),
        ...Array.map(model.rows, counter => counter.view()),
      ],
    ),
}))
