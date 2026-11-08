import { Effect, Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import type { ConstructionPending } from 'foldkit/program'

import { ApplicationBlock, Model } from './layered/block.js'
import { DraftStore } from './layered/editor.js'
import { layer } from './layered/layer.js'

const DraftStoreLayer = Layer.succeed(DraftStore, {
  save: () => Effect.void,
})

export const HostKey = Symbol('TypePerformanceLayeredHost')
const HostBlock = Block.make('TypePerformanceLayeredHost', {
  key: HostKey,
  Model: Schema.Struct({ group: ApplicationBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [DraftStore] },
})
const GroupBinding = HostBlock.makeRequiredFieldBinding(ApplicationBlock, {
  field: 'group',
}).withOutMessagePolicy({
  fold: HostBlock.makeOutMessageFold(ApplicationBlock, {
    SavedFocused: HostBlock.makeNoopStep,
  }),
})
const HostComposition = HostBlock.makeComposition({
  bindings: [GroupBinding],
})
const hostLayer = HostBlock.makeLayer({
  init: HostComposition.makeInit(() => ({ model: {} })),
  update: HostComposition.makeUpdate({}),
  view: HostComposition.makeView((model, h) =>
    h.block(
      GroupBinding.embedView({
        slotId: 'group',
        model: model.group,
      }),
    ),
  ),
}).pipe(Layer.provide(layer))

export const program = Program.makeElement({
  block: HostBlock,
  layer: hostLayer,
  container: null,
})
export const providedProgram = program.provide(DraftStoreLayer)

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type RequirementsOf<Value> =
  Value extends ConstructionPending<
    infer _Ports,
    infer _Flags,
    infer ConstructionRequirements,
    infer ExecutionRequirements,
    infer _RuntimeServices,
    infer _ProvidedServices,
    infer _SharedServices,
    'Element'
  >
    ? readonly [ConstructionRequirements, ExecutionRequirements]
    : never
type SelectedFacts =
  Extract<
    Layer.Success<typeof layer>,
    Block.ImplementationFacts<unknown, unknown, unknown>
  > extends Block.ImplementationFacts<unknown, infer Facts, unknown>
    ? Facts
    : never

export type Assertions = [
  Expect<Equal<typeof ApplicationBlock.Model.Type, Model>>,
  Expect<Equal<Layer.Services<typeof layer>, never>>,
  Expect<Equal<Layer.Error<typeof layer>, never>>,
  Expect<Equal<SelectedFacts['programRequirements'], DraftStore>>,
  Expect<Equal<RequirementsOf<typeof program>, readonly [never, DraftStore]>>,
  Expect<
    Equal<RequirementsOf<typeof providedProgram>, readonly [never, never]>
  >,
]
