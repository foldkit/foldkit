import { Socket } from 'effect/socket'

import { ApplicationBlock } from './definition'

export const ChatSocket =
  ApplicationBlock.makeResource<Socket.WebSocketLike>()('ChatSocket')
