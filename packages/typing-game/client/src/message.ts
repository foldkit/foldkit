import { Schema as S } from 'effect'
import { Url } from 'foldkit'
import { m } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'

import { Home, Room } from './page'

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const CompletedNavigateRoom = m('CompletedNavigateRoom')
export const PressedKey = m('PressedKey', { key: S.String })
export const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url.Url })
export const GotHomeMessage = m('GotHomeMessage', {
  message: Home.Message.Message,
})
export const GotRoomMessage = m('GotRoomMessage', {
  message: Room.Message.Message,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  CompletedNavigateRoom,
  PressedKey,
  ClickedLink,
  ChangedUrl,
  GotHomeMessage,
  GotRoomMessage,
])
export type Message = typeof Message.Type
