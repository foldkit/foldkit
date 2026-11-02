import { Socket } from 'effect/socket'
import { ManagedResource } from 'foldkit'

export const ChatSocket = ManagedResource.tag<Socket.WebSocketLike>()(
  'ChatRoom/ChatSocket',
)
