import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ResultTarget } from './resultTarget'

export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  PressedOpenShortcut: {},
  UpdatedQuery: { value: Schema.String },
  PressedNextResult: { resultCount: Schema.Number },
  PressedPreviousResult: { resultCount: Schema.Number },
  PressedEnter: { maybeTarget: Schema.Option(ResultTarget) },
  ClickedResult: { target: ResultTarget },
  CompletedScrollActiveResult: {},
})
export type Message = typeof Message.Type
export type UpdatedQuery = typeof Message.UpdatedQuery.Type
