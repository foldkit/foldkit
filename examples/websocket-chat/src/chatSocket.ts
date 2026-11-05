import { Socket } from 'effect/socket'

import { makeResource } from './block'

export const ChatSocket = makeResource<Socket.WebSocketLike>()('ChatSocket')
