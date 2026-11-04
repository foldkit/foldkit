import { Context, Effect, Schema, type Layer } from 'effect'

import * as Block from '../../packages/foldkit/dist/block/public.js'
import type {
  RootConstructionError,
  RootConstructionRequirements,
  SelectedLayeredRoot,
  ValidateSelectedLayer,
} from '../../packages/foldkit/dist/runtime/rootBlock.js'

class ConstructionService extends Context.Service<
  ConstructionService,
  Readonly<{ value: number }>
>()('SelectionProof/Construction') {}
const ConstructionFailure = Schema.Struct({ reason: Schema.String })
type ConstructionFailure = typeof ConstructionFailure.Type
const Key = Symbol('SelectionProofConstruction')
const Root = Block.make('SelectionProofConstruction', {
  key: Key,
  Model: Schema.Number,
  Message: Schema.Never,
  isMessageFree: true,
  Init: Schema.Tuple([]),
})
const Composition = Root.makeComposition()
const layer = Root.makeLayer(
  Effect.gen(function* () {
    const source = yield* ConstructionService
    if (source.value < 0) {
      return yield* Effect.fail(
        ConstructionFailure.make({ reason: 'unavailable' }),
      )
    }
    return {
      children: [],
      init: Composition.makeInit(() => ({ model: source.value })),
      update: Composition.makeUpdate({}),
    }
  }),
)
type Assert<Condition extends true> = Condition
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
export type ConstructionChannelProof = readonly [
  Assert<Equal<Layer.Error<typeof layer>, ConstructionFailure>>,
  Assert<Equal<Layer.Services<typeof layer>, ConstructionService>>,
  Assert<
    Equal<
      RootConstructionError<SelectedLayeredRoot<typeof Root, typeof layer>>,
      ConstructionFailure
    >
  >,
  Assert<
    Equal<
      RootConstructionRequirements<
        SelectedLayeredRoot<typeof Root, typeof layer>
      >,
      ConstructionService
    >
  >,
  Assert<Equal<ValidateSelectedLayer<typeof Root, typeof layer>, unknown>>,
]
