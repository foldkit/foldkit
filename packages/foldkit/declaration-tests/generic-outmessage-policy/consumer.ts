import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'

import { SelectionStore } from './contracts.js'
import { makeSelectionFeature } from './factory.js'

export const City = Schema.Literals(['London', 'Berlin'])
export const CityFeature = makeSelectionFeature(City)
export const initial = CityFeature.block.init()
export const selected = CityFeature.block.operations.select(initial.model, {
  value: 'London',
})

const RootDefinition = Block.makeDefinition('GenericPolicyRoot', {
  Model: Schema.Struct({ feature: CityFeature.block.Model }),
  Message: Schema.Never,
})
const FeatureBinding = RootDefinition.makeBinding(CityFeature.block, {
  field: 'feature',
}).withOutMessagePolicy({
  fold: RootDefinition.makeOutMessageFold(CityFeature.block, {
    ChoseItem: RootDefinition.makeNoopStep,
  }),
})
const RootComposition = RootDefinition.makeComposition({
  bindings: [FeatureBinding],
})
const prepareRootBlock = () =>
  RootComposition.prepareBlock({
    init: RootComposition.makeInit(() => ({ model: {} })),
    update: RootComposition.makeUpdate({}),
    view: RootComposition.makeView((model, h) =>
      h.div([], [globalThis.String(model.feature.history.recordedSelections)]),
    ),
  })
export const RootBlock: Block.FromAssemblyWithView<
  typeof RootComposition.Model,
  typeof prepareRootBlock
> = Block.assemble(prepareRootBlock)
export const pendingProgram = Program.makeElement({
  block: RootBlock,
  container: null,
})
export const StoreLayer = Layer.succeed(SelectionStore, {
  record: () => Effect.void,
})

Runtime.run(pendingProgram.provide(StoreLayer))
