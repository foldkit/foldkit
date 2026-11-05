import { Effect } from 'effect'
import { Scene } from 'foldkit'

import { ApplicationBlock, Message, layer, rootSubscriptions } from './block'
import {
  ChatBlock,
  layer as ChatLayer,
  Message as ChatMessage,
  subscriptions as chatSubscriptions,
} from './chat'

await Effect.runPromise(
  Scene.scene(
    { block: ApplicationBlock, layer },
    Scene.init(),
    Scene.Subscription.emit(rootSubscriptions.clockTicks, Message.Ticked()),
  ),
)

// Exercise a private child stream in the Scene owned by that implementation.
await Effect.runPromise(
  Scene.scene(
    { block: ChatBlock, layer: ChatLayer },
    Scene.init(),
    Scene.Subscription.emit(
      chatSubscriptions.chatServerFrames,
      ChatMessage.ReceivedServerFrame({ frame }),
    ),
  ),
)
