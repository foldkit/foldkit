import { Duration, Effect, Schema, Stream } from 'effect'
import { Subscription, type Update } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const TICK_INTERVAL_MS = 1000

// MODEL

const Model = Schema.Struct({
  count: Schema.Number,
  step: Schema.Number,
  isAutoCounting: Schema.Boolean,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedToggleAutoCount: {},
  ChangedStep: { step: Schema.Number },
  Ticked: {},
})
type Message = typeof Message.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isAutoCounting: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isAutoCounting: model.isAutoCounting,
      }),
      dependenciesToStream: ({ isAutoCounting }) =>
        Stream.when(
          Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
            Stream.map(Message.Ticked),
          ),
          Effect.sync(() => isAutoCounting),
        ),
    },
  ),
}))

// UPDATE

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + model.step }),
    }),
    ClickedToggleAutoCount: () => ({
      model: evo(model, {
        isAutoCounting: isAutoCounting => !isAutoCounting,
      }),
    }),
    ChangedStep: ({ step }) => ({ model: evo(model, { step: () => step }) }),
    Ticked: () => ({
      model: evo(model, { count: count => count + model.step }),
    }),
  })

// VIEW

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.label(
        [],
        [
          'Step: ',
          h.input([
            h.OnInput(value => Message.ChangedStep({ step: Number(value) })),
          ]),
        ],
      ),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button(
        [h.OnClick(Message.ClickedToggleAutoCount())],
        [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
      ),
    ],
  ),
})
