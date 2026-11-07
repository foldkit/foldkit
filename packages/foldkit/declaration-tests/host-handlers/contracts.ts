import { Context, Data, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ value: Schema.String })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  ClickedReadValue: {},
  CompletedReadValue: { value: Schema.String },
})
export type Message = typeof Message.Type

export class HostValue extends Context.Service<
  HostValue,
  Readonly<{ value: string; isUnavailable: boolean }>
>()('HostHandlerConsumer/HostValue') {}

export class GraphSettings extends Context.Service<
  GraphSettings,
  Readonly<{ isUnavailable: boolean }>
>()('HostHandlerConsumer/GraphSettings') {}

export class HandlerBuildError extends Data.TaggedError(
  'HandlerBuildError',
)<{}> {}
export class GraphBuildError extends Data.TaggedError('GraphBuildError')<{}> {}

export const HostKey = Symbol('HostHandlerConsumer')
export const HostDefinition = Block.makeDefinition('HostHandlerConsumer', {
  key: HostKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  operations: { requestRead: Message.ClickedReadValue },
  effects: Block.makeEffectsContract<HandlerBuildError, HostValue>(),
})
export const HostBlock = HostDefinition.contract
