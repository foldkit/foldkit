import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Subscription, type Update } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const TICK_INTERVAL_MS = 1000

// MODEL

const Model = S.Struct({
  count: S.Number,
  isAutoCounting: S.Boolean,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedToggleAutoCount: {},
  Ticked: {},
})
type Message = typeof Message.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isAutoCounting: S.Boolean },
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

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
    ClickedToggleAutoCount: () => ({
      model: evo(model, {
        isAutoCounting: isAutoCounting => !isAutoCounting,
      }),
    }),
    Ticked: () => ({ model: evo(model, { count: count => count + 1 }) }),
  })

// VIEW

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button(
        [h.OnClick(Message.ClickedToggleAutoCount())],
        [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
      ),
    ],
  ),
})
