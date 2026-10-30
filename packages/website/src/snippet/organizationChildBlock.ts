import { Effect, Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// counter.ts
const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  RequestedReset: {},
})
type CounterMessage = typeof CounterMessage.Type

const CounterOutMessage = defineMessageUnion({ ReachedMax: {} })
type CounterOutMessage = typeof CounterOutMessage.Type

export class Counter extends Block<Counter, Readonly<{ max: number }>>()(
  'Counter',
  {
    Model: Schema.Struct({ count: Schema.Number }),
    Message: CounterMessage,
    OutMessage: CounterOutMessage,
  },
) {}

export const CounterLive = Counter.make(
  Effect.fn(function* (_id, { max }) {
    return {
      model: { count: 0 },
      update: {
        ClickedIncrement: model => {
          const nextCount = model.count + 1

          if (nextCount === max) {
            return {
              model: { count: nextCount },
              outMessage: CounterOutMessage.ReachedMax(),
            }
          }

          return { model: { count: nextCount } }
        },
        RequestedReset: () => ({ model: { count: 0 } }),
      },
      view: (model, h) =>
        h.button(
          [h.OnClick(CounterMessage.ClickedIncrement())],
          [`Count: ${model.count}`],
        ),
    }
  }),
)

// dashboard.ts
const Model = Schema.Struct({
  counter: Counter,
  completedRounds: Schema.Number,
})
type Model = typeof Model.Type

export class Dashboard extends Block<Dashboard>()('Dashboard', {
  Model,
  Message: defineMessageUnion({ ClickedReset: {} }),
}) {}

export const DashboardLive = Dashboard.make(
  Effect.fn(function* () {
    const counter = yield* new Counter('counter', { max: 10 })

    return {
      model: { counter, completedRounds: 0 },
      update: {
        ClickedReset: model => ({
          model,
          messages: [model.counter.send(Counter.Message.RequestedReset())],
        }),
        ...counter.on({
          ReachedMax: model => ({
            model: modifyFields(model, { completedRounds: Number.increment }),
            messages: [model.counter.send(Counter.Message.RequestedReset())],
          }),
        }),
      },
      view: (model, h) =>
        h.section(
          [],
          [
            model.counter.view(),
            h.p([], [`Rounds: ${model.completedRounds}`]),
            h.button([h.OnClick(Dashboard.Message.ClickedReset())], ['Reset']),
          ],
        ),
    }
  }),
).pipe(Layer.provide(CounterLive))
