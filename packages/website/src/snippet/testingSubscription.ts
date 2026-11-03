import { Effect } from 'effect'
import { Scene } from 'foldkit'

import { ApplicationBlock, Message, rootSubscriptions } from './application'
import {
  ChatImplementation,
  Message as ChatMessage,
  subscriptions as chatSubscriptions,
} from './chat'

await Effect.runPromise(
  Scene.scene(
    ApplicationBlock,
    Scene.init(),
    Scene.Subscription.emit(rootSubscriptions.clockTicks, Message.Ticked()),
  ),
)

// Exercise a private child stream in the Scene owned by that implementation.
await Effect.runPromise(
  Scene.scene(
    ChatImplementation,
    Scene.init(),
    Scene.Subscription.emit(
      chatSubscriptions.chatServerFrames,
      ChatMessage.ReceivedServerFrame({ frame }),
    ),
  ),
)
