import { DateTime, Layer } from 'effect'
import { Socket } from 'effect/socket'
import { Block } from 'foldkit'

import { ApplicationLive } from './application'
import { ChatSocket, ChatSocketLive } from './chatSocket'

const fakeSocket: Socket.WebSocketLike = {
  readyState: 0,
  addEventListener: () => {},
  removeEventListener: () => {},
  close: () => {},
  send: () => {},
}

export const application = ApplicationLive.pipe(
  Layer.provide(ChatSocketLive),
  Layer.provide(Layer.succeed(Socket.WebSocketConstructor, () => fakeSocket)),
)

export const zonedAt = (timestamp: number) =>
  DateTime.makeZonedUnsafe(timestamp, { timeZone: 'UTC' })

export const deliverToChatSocket = (
  chatSocketMessage: typeof ChatSocket.Message.Type,
) => Block.deliver(ChatSocket, 'chatSocket', chatSocketMessage)
