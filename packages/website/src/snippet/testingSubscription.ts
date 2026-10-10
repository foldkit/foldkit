import { Option } from 'effect'
import { Subscription as SubscriptionDefinition } from 'foldkit'
import { Subscription, given, scene } from 'foldkit/scene'

const rootSubscriptions = SubscriptionDefinition.make<Model, Message>()(
  entry => ({
    clockTicks: entry('ClockTicks', { messages: [Message.Ticked] }),
  }),
)

const chatSubscriptions = SubscriptionDefinition.make<
  Chat.Model,
  Chat.Message
>()(entry => ({
  chatServerFrames: entry('ChatServerFrames', {
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
  Subscription.emit(rootSubscriptions.clockTicks, Message.Ticked()),
)

scene(
  { update, view, subscriptions },
  given(initialModel),
  Subscription.emit(
    liftedChatSubscriptions.chatServerFrames,
    Chat.Message.ReceivedServerFrame({ frame }),
  ),
)
