import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedNext: {},
  ClickedPrevious: {},
  ToggledPreview: {},
  ClickedSubmit: {},
  SucceededSubmitApplication: {},
  FailedSubmitApplication: { error: Schema.String },
})
export type Message = typeof Message.Type
