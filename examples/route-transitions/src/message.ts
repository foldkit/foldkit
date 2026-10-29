import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedLoadCatalog: {},
  CompletedLoadPainting: { paintingId: Schema.Number },
  UpdatedStudioDraft: { value: Schema.String },
  CompletedSaveDraft: { draft: Schema.String },
})
export type Message = typeof Message.Type
