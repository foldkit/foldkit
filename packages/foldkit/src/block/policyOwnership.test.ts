import { Effect, Schema } from 'effect'
import { expect, it } from 'vitest'

import type * as Command from '../command/index.js'
import * as Message from '../message/index.js'
import * as Update from '../update/index.js'
import type { ResolveCompositionOutput } from './deferredPolicy.js'
import * as Block from './public.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value
const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = Message.defineMessageUnion({
  RequestedPing: {},
  CompletedWork: {},
})
type ChildMessage = typeof ChildMessage.Type
const ChildOutMessage = Message.defineMessageUnion({ Pinged: {} })
type ChildOutMessage = typeof ChildOutMessage.Type
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
type ParentModel = typeof ParentModel.Type
const ParentMessage = Message.defineMessageUnion({
  RequestedStart: {},
  CompletedParentWork: {},
})
type ParentMessage = typeof ParentMessage.Type
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
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

type Recipe = ReturnType<ReturnType<typeof AlphaBinding.ping>>
type Bindings = typeof ParentComposition.bindings
type CurrentOutput = ResolveCompositionOutput<Recipe, Bindings>
type CurrentRequirements = Update.RequirementsOf<() => CurrentOutput>
type CurrentPreservesParentOwnership = Expect<
  Equal<CurrentRequirements, Command.HandlerOf<typeof ParentWork>>
>
const run = () => {
  const output = update(
    ParentBlock.init().model,
    ParentMessage.RequestedStart(),
  )
  return output.commands?.map(command => command.name)
}

it('retains parent Command ownership when parent and child display IDs match', () => {
  const exactOwnership: CurrentPreservesParentOwnership = true
  expect(exactOwnership).toBe(true)
  expect(run()).toEqual(['Alpha/ParentWork'])
})
