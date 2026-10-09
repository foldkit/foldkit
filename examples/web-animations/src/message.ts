import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedShowPanel: {},
  ClickedHidePanel: {},
  ClickedIncrementCounter: {},
  CompletedAnimatePanel: {},
  FailedAnimatePanel: { error: Schema.String },
})
export type Message = typeof Message.Type
