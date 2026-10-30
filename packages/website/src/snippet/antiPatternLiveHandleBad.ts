// ❌ Bad: module state owns the WebSocket outside the Runtime.

import { Effect } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

let socket: WebSocket | undefined

export class ChatRoom extends Block<ChatRoom, Readonly<{ roomId: string }>>()(
  'ChatRoom',
  { Message: defineMessageUnion({ ClickedJoin: {}, ClickedLeave: {} }) },
) {}

export const ChatRoomLive = ChatRoom.make(
  Effect.fn(function* (_id, { roomId }) {
    return {
      update: {
        ClickedJoin: model => {
          socket = new WebSocket(`/rooms/${roomId}`)
          return { model }
        },
        ClickedLeave: model => {
          socket?.close()
          socket = undefined
          return { model }
        },
      },
    }
  }),
)
