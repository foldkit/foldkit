import { Schema } from 'effect'
import { Block, Program } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ Ticked: {} })
type Message = typeof Message.Type

class Counter extends Block<Counter>()('Counter', {
  Model,
  Message,
}) {}

const CounterLive = Counter.toLayer(() => ({
  init: () => Model.make({ count: 0 }),
  update: {
    Ticked: model => ({ model }),
  },
  view: (model, h) => h.div([], [String(model.count)]),
}))

class Application extends Block<Application>()('Application', {
  Model,
  Message,
}) {}

const ApplicationLive = Application.toLayer(() => ({
  init: () => Model.make({ count: 0 }),
  update: {
    Ticked: model => ({ model }),
  },
  view: (model, h) => ({
    title: `Count ${model.count}`,
    body: h.div([], [String(model.count)]),
  }),
}))

export const makeInferredElement = (container: HTMLElement) =>
  Program.makeElement(Counter, {
    layer: CounterLive,
    container,
  })

export const makeInferredApplication = (container: HTMLElement | null) =>
  Program.make(Application, {
    layer: ApplicationLive,
    container,
  })
