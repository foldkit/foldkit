import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'
import { m } from 'foldkit/message'

// MESSAGE

const ClickedIncrement = m('ClickedIncrement')
const ToggledAutoCounting = m('ToggledAutoCounting')
const Ticked = m('Ticked')

const Message = S.Union(ClickedIncrement, ToggledAutoCounting, Ticked)
type Message = typeof Message.Type

// MODEL

const Model = S.Struct({
  count: S.Number,
  isAutoCounting: S.Boolean,
})

type Model = typeof Model.Type

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  tick: S.Struct({
    isAutoCounting: S.Boolean,
  }),
})

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  tick: {
    modelToDependencies: model => ({
      isAutoCounting: model.isAutoCounting,
    }),
    depsToStream: ({ isAutoCounting }) =>
      Stream.when(
        Stream.tick(Duration.seconds(1)).pipe(
          Stream.map(() => Effect.succeed(Ticked()).pipe(Command.make('Tick'))),
        ),
        () => isAutoCounting,
      ),
  },
})
