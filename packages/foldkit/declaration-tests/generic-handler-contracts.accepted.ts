import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export type ItemSchema<Item extends string, ItemEncoded> = Schema.Codec<
  Item,
  ItemEncoded,
  never,
  never
> &
  Readonly<{ '~type.make': Item }>

const EchoNamespace = Block.makeNamespace('DeclarationGenericHandlerContracts')
const Model = Schema.Struct({ id: Schema.String })

export const makeEchoParts = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
) => {
  const Message = defineMessageUnion({
    RequestedEcho: { value: Item },
    CompletedEcho: { value: Item },
  })
  const Definition = EchoNamespace.makeDefinition({ Model, Message })
  const Echo = Definition.makeCommand('Echo', {
    args: { value: Item },
    messages: [Message.CompletedEcho],
    handler: function* () {
      return ({ value }) => Effect.succeed(Message.CompletedEcho({ value }))
    },
  })
  const composition = Definition.makeComposition()
  const init = composition.makeInit((id: string) => ({
    model: Model.make({ id }),
  }))
  const update = composition.makeUpdate({
    RequestedEcho: (model, { value }) => ({
      model,
      commands: [Echo({ value })],
    }),
    CompletedEcho: model => ({ model }),
  })

  return { composition, init, update, Echo }
}

export const stringEchoParts = makeEchoParts(Schema.String)

export const makeEchoBlock = <Item extends string, ItemEncoded>(
  Item: ItemSchema<Item, ItemEncoded>,
) => {
  const { composition, init, update, Echo } = makeEchoParts(Item)

  const prepare = () =>
    composition.prepareBlock({ init, update, EffectsLayer: Echo.layer })
  const completedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof composition.Model,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

export const City = Schema.Literals(['London', 'Berlin'])
export const CityBlock = makeEchoBlock(City)

const optionalShapeParts = makeEchoParts(City)
const optionalView = optionalShapeParts.composition.makeView((_model, h) =>
  h.div([]),
)
type OptionalViewImplementation = Readonly<{
  init: typeof optionalShapeParts.init
  update: typeof optionalShapeParts.update
  EffectsLayer: typeof optionalShapeParts.Echo.layer
  view?: typeof optionalView
}>
const prepareOptionalViewBlock = () =>
  optionalShapeParts.composition.prepareBlock<OptionalViewImplementation>({
    init: optionalShapeParts.init,
    update: optionalShapeParts.update,
    EffectsLayer: optionalShapeParts.Echo.layer,
  })
export const OptionalViewBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof optionalShapeParts.composition.Model,
  typeof prepareOptionalViewBlock
> = Block.assemble(prepareOptionalViewBlock)

const pureUpdate = optionalShapeParts.composition.makeUpdate({
  RequestedEcho: model => ({
    model,
  }),
  CompletedEcho: model => ({
    model,
  }),
})
type OptionalEffectsImplementation = Readonly<{
  init: typeof optionalShapeParts.init
  update: typeof pureUpdate
  EffectsLayer?: typeof Layer.empty
}>
const prepareOptionalEffectsBlock = () =>
  optionalShapeParts.composition.prepareBlock<OptionalEffectsImplementation>({
    init: optionalShapeParts.init,
    update: pureUpdate,
  })
export const OptionalEffectsBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof optionalShapeParts.composition.Model,
  typeof prepareOptionalEffectsBlock
> = Block.assemble(prepareOptionalEffectsBlock)
