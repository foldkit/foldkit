import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { SortColumn } from './route'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedReplaceFilters: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  ChangedSearchInput: { value: Schema.String },
  ClickedColumnHeader: { column: SortColumn },
})
export type Message = typeof Message.Type
