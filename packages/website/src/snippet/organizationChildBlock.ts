import { Layer, Number, Schema } from 'effect'
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
    Model: Schema.Struct({ count: Schema.Number, max: Schema.Number }),
    Message: CounterMessage,
    OutMessage: CounterOutMessage,
  },
) {}

export const CounterLive = Counter.toLayer(() => ({
  init: ({ max }) => ({ count: 0, max }),
  update: {
    ClickedIncrement: model => {
      const nextCount = model.count + 1

      if (nextCount === model.max) {
        return {
          model: modifyFields(model, { count: () => nextCount }),
          outMessage: CounterOutMessage.ReachedMax(),
        }
      }

      return { model: modifyFields(model, { count: () => nextCount }) }
    },
    RequestedReset: model => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
  },
  view: (model, h) =>
    h.button(
      [h.OnClick(CounterMessage.ClickedIncrement())],
      [`Count: ${model.count}`],
    ),
}))

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

export const DashboardLive = Dashboard.toLayer(() => ({
  init: () => ({
    counter: new Counter('counter', { max: 10 }),
    completedRounds: 0,
  }),
  update: {
    ClickedReset: model => ({
      model,
      messages: [model.counter.send(Counter.Message.RequestedReset())],
    }),
    ...Counter.on({
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
})).pipe(Layer.provide(CounterLive))
