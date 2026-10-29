import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedRedirectToLogin: {},
  CompletedRedirectToDashboard: {},
  CompletedRedirectToHome: {},
  CompletedLoadExternal: {},
  CompletedLogError: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  SucceededSaveSession: {},
  FailedSaveSession: { error: Schema.String },
  SucceededClearSession: {},
  FailedClearSession: { error: Schema.String },
})
export type Message = typeof Message.Type
