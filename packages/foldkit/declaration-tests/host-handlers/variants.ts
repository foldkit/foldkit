import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'

import { Message, Model } from './contracts.js'

const NativeNamespace = Block.makeNamespace('NativeHostProviderCoverage')
const NativeDefinition = NativeNamespace.makeDefinition({ Model, Message })
const NativeComposition = NativeDefinition.makeComposition()
const ReadNativeValue = NativeNamespace.makeCommand('ReadValue', {
  messages: [Message.CompletedReadValue],
})
const prepare = () =>
  NativeComposition.prepareBlock({
    init: () => ({ model: { value: '' } }),
    update: NativeComposition.makeUpdate({
      ClickedReadValue: NativeDefinition.makeCommandsStep(() => [
        ReadNativeValue(),
      ]),
      CompletedReadValue: NativeDefinition.makeNoopStep(),
    }),
    EffectsLayer: Layer.empty,
    hostHandlers: [ReadNativeValue],
  })
export const NativePending: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
export const NativeHandlers = ReadNativeValue.toLayer(
  Effect.succeed(() =>
    Effect.succeed(Message.CompletedReadValue({ value: 'native' })),
  ),
)
export const Family = Query.define({
  name: 'FamilyHostProviderCoverage',
  data: Schema.String,
  error: Schema.String,
})
export const FamilyHandlers = Family.toLayer(
  Effect.succeed(() => Effect.succeed('family')),
)
