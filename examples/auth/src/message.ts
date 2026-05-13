import { Schema as S } from 'effect'
import { m } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { LoggedIn, LoggedOut } from './page'

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const CompletedLogError = m('CompletedLogError')
export const ClickedLink = m('ClickedLink', { request: UrlRequest })
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const SucceededSaveSession = m('SucceededSaveSession')
export const FailedSaveSession = m('FailedSaveSession', { error: S.String })
export const SucceededClearSession = m('SucceededClearSession')
export const FailedClearSession = m('FailedClearSession', { error: S.String })
export const GotLoggedOutMessage = m('GotLoggedOutMessage', {
  message: LoggedOut.Message,
})
export const GotLoggedInMessage = m('GotLoggedInMessage', {
  message: LoggedIn.Message,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  CompletedLogError,
  ClickedLink,
  ChangedUrl,
  SucceededSaveSession,
  FailedSaveSession,
  SucceededClearSession,
  FailedClearSession,
  GotLoggedOutMessage,
  GotLoggedInMessage,
])
export type Message = typeof Message.Type
