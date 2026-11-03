import { Layer } from 'effect'

import { ChatRoomBlock } from './chatRoom'
import { MessageComposerBlock } from './messageComposer'

export const ChatRoomWithComposerBlock = ChatRoomBlock.provide(
  MessageComposerBlock.layer,
)

export const ChatRoomLayer = ChatRoomBlock.layer.pipe(
  Layer.provide(MessageComposerBlock.layer),
)
