import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { m } from 'foldkit/message'

import { Home, Room } from './page'

export const CompletedInternalNavigation = m('CompletedInternalNavigation')
export const CompletedExternalNavigation = m('CompletedExternalNavigation')
export const CompletedUsernameInputFocus = m('CompletedUsernameInputFocus')
export const CompletedRoomNavigation = m('CompletedRoomNavigation')
export const CompletedSessionSave = m('CompletedSessionSave')
export const CompletedSessionClear = m('CompletedSessionClear')
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
  CompletedInternalNavigation,
  CompletedExternalNavigation,
  CompletedUsernameInputFocus,
  CompletedRoomNavigation,
  CompletedSessionSave,
  CompletedSessionClear,
  IgnoredKeyPress,
  ClickedLink,
  ChangedUrl,
  GotHomeMessage,
  GotRoomMessage,
)
export type Message = typeof Message.Type
