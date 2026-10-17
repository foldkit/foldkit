import { Socket } from 'effect/socket'

import { Application } from './definition'

export const ChatSocket =
  Application.resource<Socket.WebSocketLike>()('ChatSocket')
