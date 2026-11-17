import { Schema } from 'effect'
import { Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({
  requested: Schema.Option(Runtime.CompositionIdentity),
  accepted: Schema.Option(Runtime.CompositionIdentity),
  requestCount: Schema.Number,
  count: Schema.Number,
  failure: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedReports: {},
  ClickedHome: {},
  CompletedLoadComposition: { identity: Runtime.CompositionIdentity },
  FailedLoadComposition: {
    identity: Runtime.CompositionIdentity,
    reason: Schema.String,
  },
  ClickedIncrement: {},
})
export type Message = typeof Message.Type
