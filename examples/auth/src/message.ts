import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { m } from 'foldkit/message'
import { Url } from 'foldkit/url'

import { Session } from './domain/session'
import { LoggedIn, LoggedOut } from './page'

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedNavigateExternal = m('CompletedNavigateExternal')
export const CompletedLogError = m('CompletedLogError')
export const ClickedLink = m('ClickedLink', { request: Runtime.UrlRequest })
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const LoadedSession = m('LoadedSession', { session: S.Option(Session) })
export const SavedSession = m('SavedSession')
export const FailedSaveSession = m('FailedSaveSession', { error: S.String })
export const ClearedSession = m('ClearedSession')
export const FailedClearSession = m('FailedClearSession', { error: S.String })
export const GotLoggedOutMessage = m('GotLoggedOutMessage', {
  message: LoggedOut.Message,
})
export const GotLoggedInMessage = m('GotLoggedInMessage', {
  message: LoggedIn.Message,
})

export const Message = S.Union(
  CompletedNavigateInternal,
  CompletedNavigateExternal,
  CompletedLogError,
  ClickedLink,
  ChangedUrl,
  LoadedSession,
  SavedSession,
  FailedSaveSession,
  ClearedSession,
  FailedClearSession,
  GotLoggedOutMessage,
  GotLoggedInMessage,
)
export type Message = typeof Message.Type
