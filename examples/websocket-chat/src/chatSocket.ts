import { makeResource } from './block'
import type { WebSocketConnection } from './webSocketConnection'

export const ChatSocket = makeResource<WebSocketConnection>()('ChatSocket')
