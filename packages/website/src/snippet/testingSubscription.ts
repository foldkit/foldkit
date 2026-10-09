import { Option } from 'effect'
import { Subscription as SubscriptionDefinition } from 'foldkit'
import { Subscription, given, scene } from 'foldkit/scene'

const rootSubscriptions = SubscriptionDefinition.make<Model, Message>()(
  entry => ({
    ticks: entry('ClockTicks', { messages: [Message.Ticked] }),
  }),
)

const chatSubscriptions = SubscriptionDefinition.make<
  Chat.Model,
  Chat.Message
>()(entry => ({
  serverFrames: entry('ChatServerFrames', {
    messages: [Chat.Message.ReceivedServerFrame],
  }),
}))

const liftedChatSubscriptions = SubscriptionDefinition.lift(chatSubscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.chat),
  toParentMessage: message => Message.GotChatMessage({ message }),
})

const subscriptions = SubscriptionDefinition.aggregate(
  rootSubscriptions,
  liftedChatSubscriptions,
)

scene(
  { update, view, subscriptions },
  given(initialModel),
  Subscription.emit(Message.Ticked()),
)

scene(
  { update, view, subscriptions },
  given(initialModel),
  Subscription.emit(
    liftedChatSubscriptions.serverFrames,
    Chat.Message.ReceivedServerFrame({ frame }),
  ),
)
