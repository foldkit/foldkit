import * as Scene from 'foldkit/scene'

import { Message } from './chatRoom/message'
import { subscriptions } from './chatRoom/subscription'
import { ChatRoomWithComposerBlock } from './provided'

export const plain = Scene.scene(
  ChatRoomWithComposerBlock,
  Scene.init({ title: 'General', inputId: 'input' }),
)

export const withSubscription = Scene.scene(
  ChatRoomWithComposerBlock,
  Scene.init({ title: 'General', inputId: 'input' }),
  Scene.Subscription.emit(
    subscriptions.chatSocketMessages,
    Message.ReceivedMessage({ text: 'Echo' }),
  ),
)
