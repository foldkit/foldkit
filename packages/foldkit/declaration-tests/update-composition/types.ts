import type * as Block from 'foldkit/block'

export type PlanOutput<Value> =
  Value extends Block.Plan<infer Output> ? Output : never
export type ChannelsOf<Value> =
  Value extends Block.OperationOutputs<infer Channels> ? Channels : never
