import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { m } from 'foldkit/message'

import { Home, Room } from './page'

export const NoOp = m('NoOp')
export const ClickedLink = m('ClickedLink', {
  request: Runtime.UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url.Url })
export const GotHomeMessage = m('GotHomeMessage', {
  message: Home.Message.Message,
})
export const GotRoomMessage = m('GotRoomMessage', {
  message: Room.Message.Message,
})

export const Message = S.Union(
  NoOp,
  ClickedLink,
  ChangedUrl,
  GotHomeMessage,
  GotRoomMessage,
)
export type Message = typeof Message.Type
