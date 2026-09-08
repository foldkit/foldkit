import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { LoggedIn, LoggedOut } from './page'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedLogError: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  SucceededSaveSession: {},
  FailedSaveSession: { error: Schema.String },
  SucceededClearSession: {},
  FailedClearSession: { error: Schema.String },
  GotLoggedOutMessage: { message: LoggedOut.Message },
  GotLoggedInMessage: { message: LoggedIn.Message },
})

export type Message = typeof Message.Type
