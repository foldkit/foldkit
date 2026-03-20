import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { m } from 'foldkit/message'

import { Home, Room } from './page'

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedNavigateExternal = m('CompletedNavigateExternal')
export const CompletedFocusUsernameInput = m('CompletedFocusUsernameInput')
export const CompletedNavigateRoom = m('CompletedNavigateRoom')
export const CompletedSaveSession = m('CompletedSaveSession')
export const CompletedClearSession = m('CompletedClearSession')
export const IgnoredKeyPress = m('IgnoredKeyPress')
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
  CompletedNavigateInternal,
  CompletedNavigateExternal,
  CompletedFocusUsernameInput,
  CompletedNavigateRoom,
  CompletedSaveSession,
  CompletedClearSession,
  IgnoredKeyPress,
  ClickedLink,
  ChangedUrl,
  GotHomeMessage,
  GotRoomMessage,
)
export type Message = typeof Message.Type
