import { Effect, Schema } from 'effect'
import { Block, Message } from 'foldkit'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = Message.defineMessageUnion({
  RequestedPing: {},
  CompletedWork: {},
})
const ChildOutMessage = Message.defineMessageUnion({ Pinged: {} })
const AlphaDefinition = Block.makeDefinition('Alpha', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const AlphaWork = AlphaDefinition.makeCommand('AlphaWork', {
  messages: [ChildMessage.CompletedWork],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedWork())
  },
})
const AlphaComposition = AlphaDefinition.makeComposition()
const prepareAlpha = () =>
  AlphaComposition.prepareBlock({
    init: AlphaComposition.makeInit(() => ({ model: { count: 0 } })),
    update: AlphaComposition.makeUpdate({
      RequestedPing: AlphaDefinition.makeOutMessageStep(() =>
        ChildOutMessage.Pinged(),
      ),
      CompletedWork: AlphaDefinition.makeNoopStep(),
    }),
    operations: { ping: ChildMessage.RequestedPing },
    EffectsLayer: AlphaWork.layer,
  })
const AlphaBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareAlpha
> = Block.assemble(prepareAlpha)
const BetaDefinition = Block.makeDefinition('Beta', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const BetaComposition = BetaDefinition.makeComposition()
const prepareBeta = () =>
  BetaComposition.prepareBlock({
    init: BetaComposition.makeInit(() => ({ model: { count: 0 } })),
    update: BetaComposition.makeUpdate({
      RequestedPing: BetaDefinition.makeOutMessageStep(() =>
        ChildOutMessage.Pinged(),
      ),
      CompletedWork: BetaDefinition.makeNoopStep(),
    }),
    operations: { ping: ChildMessage.RequestedPing },
  })
const BetaBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareBeta
> = Block.assemble(prepareBeta)
const ParentModel = Schema.Struct({
  alpha: AlphaBlock.Model,
  beta: BetaBlock.Model,
})
const ParentMessage = Message.defineMessageUnion({
  RequestedStart: {},
  CompletedParentWork: {},
})
const ParentDefinition = Block.makeDefinition('Alpha', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ParentWork = ParentDefinition.makeCommand('ParentWork', {
  messages: [ParentMessage.CompletedParentWork],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.CompletedParentWork())
  },
})
const AlphaBinding = ParentDefinition.makeBinding(AlphaBlock, {
  field: 'alpha',
})
const BetaBinding = ParentDefinition.makeBinding(BetaBlock, { field: 'beta' })
const ConfiguredAlphaBinding = AlphaBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(AlphaBlock, {
    Pinged: () => BetaBinding.ping(),
  }),
})
const ConfiguredBetaBinding = BetaBinding.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(BetaBlock, {
    Pinged: () => ParentDefinition.makeCommandsStep(() => [ParentWork()]),
  }),
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ConfiguredAlphaBinding, ConfiguredBetaBinding],
})
const update = ParentComposition.makeUpdate({
  RequestedStart: AlphaBinding.ping(),
  CompletedParentWork: ParentDefinition.makeNoopStep(),
})
const prepareParent = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({ model: {} })),
    update,
    EffectsLayer: ParentWork.layer,
  })
export const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

export const run = () => {
  const output = update(
    ParentBlock.init().model,
    ParentMessage.RequestedStart(),
  )
  return output.commands?.map(command => command.name)
}
