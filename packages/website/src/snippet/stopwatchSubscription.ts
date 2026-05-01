import { Duration, Schema as S, Stream } from 'effect'
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

const SubscriptionDeps = S.Struct({
  tick: S.Struct({
    isRunning: S.Boolean,
  }),
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  tick: {
    modelToDependencies: model => ({ isRunning: model.isRunning }),
    dependenciesToStream: ({ isRunning }) =>
      Stream.when(
        Stream.tick(Duration.millis(100)).pipe(Stream.map(Ticked)),
        Effect.sync(() => isRunning),
      ),
  },
})
