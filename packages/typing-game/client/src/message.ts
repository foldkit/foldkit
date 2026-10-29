import { Url } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedNavigateToRoom: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url.Url },
})
export type Message = typeof Message.Type
