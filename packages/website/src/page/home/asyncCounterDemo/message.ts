import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedDemoIncrement: {},
  ChangedDemoResetDuration: { seconds: Schema.Number },
  ClickedDemoReset: {},
  CompletedDelayAdvanceAsyncCounterPhase: { generation: Schema.Number },
})
export type Message = typeof Message.Type
