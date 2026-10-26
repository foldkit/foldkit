import { Effect, Layer, Schema } from 'effect'
import { Block, Command, Message, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import {
  CountStore,
  GeneratedDispatchChildBlock,
  PreparationFailure,
} from './generated-dispatch.accepted.js'

export const Model = Schema.Struct({
  child: GeneratedDispatchChildBlock.Model,
  isReady: Schema.Boolean,
})
export const LocalMessage = Message.defineMessageUnion({
  CompletedPrepare: {},
})
export const ComposedInitDefinition = Block.makeDefinition('ComposedInit', {
  Model,
  Message: LocalMessage,
})
export const Prepare = ComposedInitDefinition.makeCommand('Prepare', {
  messages: [LocalMessage.CompletedPrepare],
  handler: function* () {
    return () => Effect.succeed(LocalMessage.CompletedPrepare())
  },
})
export const ChildBinding = ComposedInitDefinition.makeBinding(
  GeneratedDispatchChildBlock,
  { field: 'child' },
)
export const ComposedInitComposition = ComposedInitDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const prepareStep = ComposedInitDefinition.makeStep(model => ({
  model: modifyFields(model, { isReady: () => true }),
  commands: [Prepare()],
}))
export const prepareTogetherStep = ComposedInitDefinition.makeStep(() =>
  Update.combineSteps([ChildBinding.requestReadCount(), prepareStep]),
)
export const init = ComposedInitComposition.makeInit((isReady: boolean) => ({
  model: { isReady },
  steps: [prepareTogetherStep],
}))
export const prepareComposedInitBlock = () =>
  ComposedInitComposition.prepareBlock({
    init,
    update: ComposedInitComposition.makeUpdate({
      CompletedPrepare: model => ({ model }),
    }),
    EffectsLayer: Prepare.layer,
  })

export const RawComposedInitBlock: CompletedAssembly<
  typeof prepareComposedInitBlock
> = Block.assemble(prepareComposedInitBlock)
export const ComposedInitBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ComposedInitComposition.Model,
  typeof prepareComposedInitBlock
> = Block.assemble(prepareComposedInitBlock)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ExactArguments = Expect<
  Equal<Parameters<typeof init>, [isReady: boolean]>
>
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof init>,
    | Update.RequirementsOf<ReturnType<typeof ChildBinding.requestReadCount>>
    | Command.HandlerOf<typeof Prepare>
  >
>
export type ExactServices = Expect<
  Equal<Layer.Services<typeof ComposedInitBlock.EffectsLayer>, CountStore>
>
export type ExactConstructorError = Expect<
  Equal<Layer.Error<typeof ComposedInitBlock.EffectsLayer>, PreparationFailure>
>

type CompletedAssembly<Producer extends () => Block.AssemblyDraft<object>> =
  ReturnType<Producer> extends Block.AssemblyDraft<infer Completed>
    ? Completed
    : never
