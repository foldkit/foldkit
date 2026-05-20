import { Duration, Effect, Match as M, Schema as S, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'
import { Document, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

const TICK_INTERVAL_MS = 1000

// MODEL

const Model = S.Struct({
  count: S.Number,
  isAutoCounting: S.Boolean,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedIncrement = m('ClickedIncrement')
const ClickedToggleAutoCount = m('ClickedToggleAutoCount')
const Ticked = m('Ticked')

const Message = S.Union([ClickedIncrement, ClickedToggleAutoCount, Ticked])
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
            Stream.map(Ticked),
          ),
          Effect.sync(() => isAutoCounting),
        ),
    },
  ),
}))

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { count: count => count + 1 }), []],
      ClickedToggleAutoCount: () => [
        evo(model, {
          isAutoCounting: isAutoCounting => !isAutoCounting,
        }),
        [],
      ],
      Ticked: () => [evo(model, { count: count => count + 1 }), []],
    }),
  )

// VIEW

const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: `Count: ${model.count}`,
    body: h.div(
      [],
      [
        h.p([], [`Count: ${model.count}`]),
        h.button([h.OnClick(ClickedIncrement())], ['Increment']),
        h.button(
          [h.OnClick(ClickedToggleAutoCount())],
          [model.isAutoCounting ? 'Stop' : 'Auto-Count'],
        ),
      ],
    ),
  }
}
