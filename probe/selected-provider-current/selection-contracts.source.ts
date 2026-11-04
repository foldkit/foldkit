import { Context, Effect, Layer, Schema } from 'effect'

import * as Block from '../../packages/foldkit/src/block/public.js'
import type {
  DescriptorTypeId,
  ConstructorEffectOf,
  ViewContract,
} from '../../packages/foldkit/src/experimental/constructed/contract.js'
import type {
  Contract,
  ContractGraph,
} from '../../packages/foldkit/src/experimental/contracted/contract.js'
import type { SelectedImplementationFacts } from '../../packages/foldkit/src/experimental/contracted/implementationFacts.js'
import * as Server from '../../packages/foldkit/src/experimental/server/public.js'
import * as Program from '../../packages/foldkit/src/runtime/programPublic.js'
import type {
  SelectedLayeredRoot,
  RootRequirements,
  ValidateSelectedLayer,
} from '../../packages/foldkit/src/runtime/rootBlock.js'
import * as Scene from '../../packages/foldkit/src/scene/public.js'
import * as Story from '../../packages/foldkit/src/story/public.js'

class SelectedAService extends Context.Service<
  SelectedAService,
  Readonly<{ value: number }>
>()('ResultServiceProbe/SelectedA') {}
class SelectedBService extends Context.Service<
  SelectedBService,
  Readonly<{ value: number }>
>()('ResultServiceProbe/SelectedB') {}

const ProbeKey = Symbol('ResultServiceProbe')
const ProbeModel = Schema.Struct({ value: Schema.Number })
const ProbeBlock = Block.make('ResultServiceProbe', {
  key: ProbeKey,
  Model: ProbeModel,
  Message: Schema.Never,
  isMessageFree: true,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
type ProbeFacts = (typeof ProbeBlock)[typeof DescriptorTypeId]
type SelectionFacts<Service, Kind extends 'Element' | 'Document'> = Omit<
  ProbeFacts,
  | 'effectsLayerRequirements'
  | 'hostRequirements'
  | 'programRequirements'
  | 'view'
> &
  Readonly<{
    effectsLayerRequirements: Service
    hostRequirements: never
    programRequirements: Service
    view: ViewContract<void, Kind>
  }>
type SelectedBlock<Service, Kind extends 'Element' | 'Document'> = Contract<
  typeof ProbeBlock.owner,
  typeof ProbeModel,
  typeof Schema.Never,
  undefined,
  SelectionFacts<Service, Kind>
>
type SelectedResult<
  Service,
  Kind extends 'Element' | 'Document',
> = ContractGraph<
  typeof ProbeBlock.owner,
  typeof ProbeModel,
  typeof Schema.Never,
  undefined,
  SelectionFacts<Service, Kind>
>
type SelectedLayer<Service, Kind extends 'Element' | 'Document'> = Layer.Layer<
  | SelectedResult<Service, Kind>
  | SelectedImplementationFacts<
      SelectedResult<Service, Kind>,
      typeof ProbeBlock.owner,
      SelectionFacts<Service, Kind>
    >
>

declare const selectedA: SelectedBlock<SelectedAService, 'Element'>
declare const selectedBLayer: SelectedLayer<SelectedBService, 'Element'>
declare const selectedALayer: SelectedLayer<SelectedAService, 'Element'>
declare const selectedDocumentA: SelectedBlock<SelectedAService, 'Document'>
declare const selectedDocumentBLayer: SelectedLayer<
  SelectedBService,
  'Document'
>
declare const selectedDocumentALayer: SelectedLayer<
  SelectedAService,
  'Document'
>

type Assert<Condition extends true> = Condition
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Merged = Layer.Layer<
  Layer.Success<typeof selectedALayer | typeof selectedBLayer>
>
type SelectedMergedA = Assert<
  Equal<
    RootRequirements<SelectedLayeredRoot<typeof selectedA, Merged>>,
    SelectedAService
  >
>
type SelectedBMerged = Contract<
  typeof ProbeBlock.owner,
  typeof ProbeModel,
  typeof Schema.Never,
  undefined,
  SelectionFacts<SelectedBService, 'Element'>
>
type SelectedMergedB = Assert<
  Equal<
    RootRequirements<SelectedLayeredRoot<SelectedBMerged, Merged>>,
    SelectedBService
  >
>
type AcceptMerged = Assert<
  Equal<ValidateSelectedLayer<typeof selectedA, Merged>, unknown>
>
declare const merged: Merged
type OtherViewFacts = Omit<
  SelectionFacts<SelectedBService, 'Element'>,
  'view'
> &
  Readonly<{ view: ViewContract<Readonly<{ choice: string }>, 'Element'> }>
type OtherViewResult = ContractGraph<
  typeof ProbeBlock.owner,
  typeof ProbeModel,
  typeof Schema.Never,
  undefined,
  OtherViewFacts
>
declare const mergedWithForeignViewInputs: Layer.Layer<
  | Layer.Success<typeof selectedALayer>
  | OtherViewResult
  | SelectedImplementationFacts<
      OtherViewResult,
      typeof ProbeBlock.owner,
      OtherViewFacts
    >
>
declare const mergedDocuments: Layer.Layer<
  Layer.Success<typeof selectedDocumentALayer | typeof selectedDocumentBLayer>
>
type SelectedDocumentRequirements = Assert<
  Equal<
    RootRequirements<
      SelectedLayeredRoot<typeof selectedDocumentA, typeof mergedDocuments>
    >,
    SelectedAService
  >
>

declare const forgedCorrelation: Layer.Layer<
  | SelectedResult<SelectedAService, 'Element'>
  | SelectedImplementationFacts<
      SelectedResult<SelectedBService, 'Element'>,
      typeof ProbeBlock.owner,
      SelectionFacts<SelectedBService, 'Element'>
    >
>
type RejectUnpairedFacts = Assert<
  Equal<
    ValidateSelectedLayer<typeof selectedA, typeof forgedCorrelation>,
    Readonly<{
      'Layer has no checked implementation Facts for the paired Block': typeof forgedCorrelation
    }>
  >
>
declare const foreignPending: unique symbol
type WithPendingB = Layer.Layer<
  | Layer.Success<typeof selectedALayer>
  | SelectedResult<SelectedBService, 'Element'>
  | SelectedImplementationFacts<
      SelectedResult<SelectedBService, 'Element'>,
      typeof ProbeBlock.owner,
      SelectionFacts<SelectedBService, 'Element'>,
      typeof foreignPending
    >
>
type ForeignPendingDoesNotPoison = Assert<
  Equal<ValidateSelectedLayer<typeof selectedA, WithPendingB>, unknown>
>
type MatchedPending = Layer.Layer<
  | SelectedResult<SelectedAService, 'Element'>
  | SelectedImplementationFacts<
      SelectedResult<SelectedAService, 'Element'>,
      typeof ProbeBlock.owner,
      SelectionFacts<SelectedAService, 'Element'>,
      typeof foreignPending
    >
>
declare const matchedPendingLayer: MatchedPending
type RejectMatchedPending = Assert<
  Equal<
    ValidateSelectedLayer<typeof selectedA, MatchedPending>,
    Readonly<{
      'Select this Block Layer’s host handlers before hosting it': typeof foreignPending
    }>
  >
>
type SelectedRequirements = Assert<
  Equal<
    RootRequirements<
      SelectedLayeredRoot<typeof selectedA, typeof selectedALayer>
    >,
    SelectedAService
  >
>
type AcceptedSamePublicTypes = Assert<
  Equal<ValidateSelectedLayer<typeof selectedA, typeof selectedALayer>, unknown>
>
type RejectedDifferentPublicTypes = Assert<
  Equal<
    ValidateSelectedLayer<typeof selectedA, typeof selectedBLayer>,
    Readonly<{
      'Selected Layer must implement the paired Block public contract': typeof selectedBLayer
    }>
  >
>
type BindingRequiresSelectedResult = Assert<
  Equal<
    Effect.Services<ConstructorEffectOf<typeof selectedA>>,
    ContractGraph<
      typeof ProbeBlock.owner,
      typeof ProbeModel,
      typeof Schema.Never,
      undefined,
      SelectionFacts<SelectedAService, 'Element'>
    >
  >
>

if (false) {
  Program.makeElement({
    block: selectedA,
    layer: selectedALayer,
    container: null,
  })
  Program.makeElement({ block: selectedA, layer: merged, container: null })
  const inferredMerged = Layer.mergeAll(selectedALayer, selectedBLayer)
  Program.makeElement({
    block: selectedA,
    layer: inferredMerged,
    container: null,
  })
  Story.story(
    { block: selectedA, layer: inferredMerged },
    Story.given({ value: 0 }),
  )
  Scene.scene(
    { block: selectedA, layer: inferredMerged },
    Scene.given({ value: 0 }),
  )
  Scene.scene(
    { block: selectedA, layer: mergedWithForeignViewInputs },
    Scene.given({ value: 0 }),
  )
  Server.renderToString(
    { block: selectedDocumentA, layer: mergedDocuments },
    {},
  )
  Story.story({ block: selectedA, layer: merged }, Story.given({ value: 0 }))
  Scene.scene({ block: selectedA, layer: merged }, Scene.given({ value: 0 }))
  // @ts-expect-error A public result marker cannot authenticate private facts for another selection.
  Program.makeElement({
    block: selectedA,
    layer: forgedCorrelation,
    container: null,
  })
  Server.renderToString(
    { block: selectedDocumentA, layer: selectedDocumentALayer },
    {},
  )
  Story.story(
    { block: selectedA, layer: selectedALayer },
    Story.given({ value: 0 }),
  )
  Scene.scene(
    { block: selectedA, layer: selectedALayer },
    Scene.given({ value: 0 }),
  )

  // @ts-expect-error Same owner and Schemas do not make different selected Service contracts compatible.
  Program.makeElement({
    block: selectedA,
    layer: selectedBLayer,
    container: null,
  })
  // @ts-expect-error Server must validate the paired public contract.
  Server.renderToString({ block: selectedDocumentA, layer: selectedDocumentBLayer }, {})
  Story.story(
    // @ts-expect-error Story must validate the paired public contract.
    { block: selectedA, layer: selectedBLayer },
    Story.given({ value: 0 }),
  )
  Scene.scene(
    // @ts-expect-error Scene must validate the paired public contract.
    { block: selectedA, layer: selectedBLayer },
    Scene.given({ value: 0 }),
  )

  // @ts-expect-error Matching public identity still needs original host readiness.
  Program.makeElement({
    block: selectedA,
    layer: matchedPendingLayer,
    container: null,
  })
  Story.story(
    // @ts-expect-error Story must reject pending handlers on the matched selected implementation.
    { block: selectedA, layer: matchedPendingLayer },
    Story.given({ value: 0 }),
  )
  Scene.scene(
    // @ts-expect-error Scene must reject pending handlers on the matched selected implementation.
    { block: selectedA, layer: matchedPendingLayer },
    Scene.given({ value: 0 }),
  )

  const wrongPair = { block: selectedA, layer: selectedBLayer }
  // @ts-expect-error A variable pair cannot fall back to legacy Story config and ignore its Layer.
  Story.story(wrongPair, Story.given({ value: 0 }))
  // @ts-expect-error A variable pair cannot fall back to legacy Scene config and ignore its Layer.
  Scene.scene(wrongPair, Scene.given({ value: 0 }))
  // @ts-expect-error Direct fixture acquisition validates the paired selection too.
  Story.withBlock(wrongPair, executable => executable.init())

  const ParentKey = Symbol('ResultServiceProbeParent')
  const Parent = Block.make('ResultServiceProbeParent', {
    key: ParentKey,
    Model: Schema.Struct({ child: ProbeModel }),
    Message: Schema.Never,
    isMessageFree: true,
    Init: Schema.Tuple([]),
  })
  const ChildBinding = Parent.makeBinding(selectedA, { field: 'child' })
  const constructor = Effect.gen(function* () {
    return yield* ChildBinding
  })
  const wrongProvision = Effect.provide(constructor, selectedBLayer)
  const correctProvision = Effect.provide(constructor, selectedALayer)
  const complete: Effect.Effect<Effect.Success<typeof constructor>> =
    correctProvision
  // @ts-expect-error A Layer of another selected contract leaves the Binding's exact Result requirement unresolved.
  const incomplete: Effect.Effect<Effect.Success<typeof constructor>> =
    wrongProvision
  void complete
  void incomplete
}

export type SelectionProof = readonly [
  SelectedRequirements,
  AcceptedSamePublicTypes,
  RejectedDifferentPublicTypes,
  BindingRequiresSelectedResult,
  SelectedMergedA,
  SelectedMergedB,
  AcceptMerged,
  RejectUnpairedFacts,
  ForeignPendingDoesNotPoison,
  RejectMatchedPending,
  SelectedDocumentRequirements,
]

export type SelectionCases = Readonly<{
  Block: typeof selectedA
  LayerA: typeof selectedALayer
  LayerB: typeof selectedBLayer
}>
