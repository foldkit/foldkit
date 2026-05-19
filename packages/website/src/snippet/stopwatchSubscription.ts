import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'
import { m } from 'foldkit/message'

// MESSAGE

const Ticked = m('Ticked')
const Message = S.Union([Ticked])
type Message = typeof Message.Type

// MODEL

const Model = S.Struct({
  isRunning: S.Boolean,
  elapsed: S.Number,
})

type Model = typeof Model.Type

// SUBSCRIPTION

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  tick: entry(
    { isRunning: S.Boolean },
    {
      modelToDependencies: model => ({ isRunning: model.isRunning }),
      dependenciesToStream: ({ isRunning }) =>
        Stream.when(
          Stream.tick(Duration.millis(100)).pipe(Stream.map(Ticked)),
          Effect.sync(() => isRunning),
        ),
    },
  ),
}))
