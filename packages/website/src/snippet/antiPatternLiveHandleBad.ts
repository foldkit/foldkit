// ❌ Bad: module state owns the WebSocket outside the Runtime.

import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

let socket: WebSocket | undefined

export class ChatRoom extends Block<ChatRoom, Readonly<{ roomId: string }>>()(
  'ChatRoom',
  {
    Model: Schema.Struct({ roomId: Schema.String }),
    Message: defineMessageUnion({ ClickedJoin: {}, ClickedLeave: {} }),
  },
) {}

export const ChatRoomLive = ChatRoom.toLayer(() => ({
  init: ({ roomId }) => ({ roomId }),

  update: {
    ClickedJoin: model => {
      socket = new WebSocket(`/rooms/${model.roomId}`)
      return { model }
    },
    ClickedLeave: model => {
      socket?.close()
      socket = undefined
      return { model }
    },
  },
}))
