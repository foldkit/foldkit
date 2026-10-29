import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const AnimationPhase = Schema.Literals([
  'Idle',
  'IncrementMessage',
  'IncrementUpdate',
  'IncrementModel',
  'DurationMessage',
  'DurationUpdate',
  'DurationModel',
  'ResetMessage',
  'ResetUpdate',
  'ResetCommand',
  'ResetCommandMessage',
  'ResetCommandUpdate',
  'ResetModel',
])
export type AnimationPhase = typeof AnimationPhase.Type

export const Model = Schema.Struct({
  count: Schema.Number,
  isResetting: Schema.Boolean,
  resetDuration: Schema.Number,
  phase: AnimationPhase,
  generation: Schema.Number,
  messageLog: Schema.Array(Schema.String),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedDemoIncrement: {},
  ChangedDemoResetDuration: { seconds: Schema.Number },
  ClickedDemoReset: {},
  CompletedDelayAdvanceAsyncCounterPhase: { generation: Schema.Number },
})
export type Message = typeof Message.Type

export const AsyncCounterDemoDefinition = Block.makeDefinition(
  'AsyncCounterDemo',
  {
    Model,
    Message,
  },
)
