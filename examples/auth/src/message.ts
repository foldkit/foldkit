import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { m } from 'foldkit/message'
import { Url } from 'foldkit/url'

import { Session } from './domain/session'
import { LoggedIn, LoggedOut } from './page'

export const CompletedInternalNavigation = m('CompletedInternalNavigation')
export const CompletedExternalNavigation = m('CompletedExternalNavigation')
export const CompletedSessionSave = m('CompletedSessionSave')
export const CompletedSessionClear = m('CompletedSessionClear')
export const CompletedErrorLog = m('CompletedErrorLog')
export const ClickedLink = m('ClickedLink', { request: Runtime.UrlRequest })
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const LoadedSession = m('LoadedSession', { session: S.Option(Session) })
export const SavedSession = m('SavedSession')
export const FailedSessionSave = m('FailedSessionSave', { error: S.String })
export const ClearedSession = m('ClearedSession')
export const FailedSessionClear = m('FailedSessionClear', { error: S.String })
export const GotLoggedOutMessage = m('GotLoggedOutMessage', {
  message: LoggedOut.Message,
})
export const GotLoggedInMessage = m('GotLoggedInMessage', {
  message: LoggedIn.Message,
})

export const Message = S.Union(
  CompletedInternalNavigation,
  CompletedExternalNavigation,
  CompletedSessionSave,
  CompletedSessionClear,
  CompletedErrorLog,
  ClickedLink,
  ChangedUrl,
  LoadedSession,
  SavedSession,
  FailedSessionSave,
  ClearedSession,
  FailedSessionClear,
  GotLoggedOutMessage,
  GotLoggedInMessage,
)
export type Message = typeof Message.Type
