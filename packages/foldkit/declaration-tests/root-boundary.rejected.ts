import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as MessageModule from 'foldkit/message'
import * as Program from 'foldkit/program'
import type * as Url from 'foldkit/url'

import {
  type ApplicationImplementation,
  type ApplicationMessage,
  ApplicationRoot,
  type ApplicationRootChannels,
  Count,
  DocumentRoot,
  FlagsRoot,
  GenericParts,
  LeafBlock,
  LifecycleComposition,
  Load,
  Message,
  MinimalComposition,
  Model,
  NodeBlock,
  PendingElement,
  PendingLayerInput,
  QueryComposition,
  type QueryImplementation,
  type QueryInitResult,
  QueryMessage,
  type QueryMessageContract,
  QueryModel,
  type QueryOperationInput,
  type QueryOperationResult,
  QueryOperationsRoot,
  type QueryOperationsRootChannels,
  QueryRoot,
  type QueryRootChannels,
  QueryRouting,
  type QueryUpdateResult,
  RootBoundaryComposition,
  RootBoundaryDefinition,
  RootBoundaryNestedDefinition,
  RootBoundaryNodeDefinition,
  StoreConfig,
  UnionKeyedOtherPlacementBlock,
  UnionKeyedRegisteredBlock,
  type UnionKeyedSession,
  UnionRegisteredBlock,
  UnionRegisteredRoot,
  UnionRenamedRegistrationRoot,
  UnionSessionReaderLayer,
  UnionUnregisteredBlock,
  UnionUnregisteredRoot,
  documentView,
  implementation,
  lifecycleImplementation,
  minimalImplementation,
  nestedImplementation,
  nodeImplementation,
  queryOperationsImplementation,
} from './root-boundary.accepted.js'

const NavigationMessage = MessageModule.defineMessageUnion({
  ChangedLocation: {},
})
const navigationRouting = {
  onUrlRequest: () => NavigationMessage.ChangedLocation(),
  onUrlChange: () => NavigationMessage.ChangedLocation(),
}
type BroaderQueryMessage = Schema.Codec<
  typeof QueryMessage.Type | typeof NavigationMessage.Type,
  typeof QueryMessage.Encoded | typeof NavigationMessage.Encoded
>
type BroaderMessageRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  BroaderQueryMessage,
  QueryImplementation,
  QueryRootChannels
>
const broaderMessageRoot: BroaderMessageRoot = QueryRoot
Program.make({
  block: broaderMessageRoot,
  container: null,
  // @ts-expect-error Routing cannot dispatch Messages outside the assembled update contract.
  routing: navigationRouting,
})

type BroaderQueryOwner =
  | typeof QueryComposition.owner
  | typeof RootBoundaryComposition.owner
type BroaderOwnerRoot = Block.Root<
  BroaderQueryOwner,
  typeof QueryModel,
  QueryMessageContract,
  QueryImplementation,
  QueryRootChannels
>
const broaderOwnerRoot: BroaderOwnerRoot = QueryRoot
Program.make({
  block: broaderOwnerRoot,
  container: null,
  // @ts-expect-error An exact assembly proof cannot admit a widened public Owner.
  routing: QueryRouting,
})

type BroaderQueryModel = Schema.Codec<
  typeof QueryModel.Type | null,
  typeof QueryModel.Encoded | null
>
type BroaderModelRoot = Block.Root<
  typeof QueryComposition.owner,
  BroaderQueryModel,
  QueryMessageContract,
  QueryImplementation,
  QueryRootChannels
>
const broaderModelRoot: BroaderModelRoot = QueryRoot
Program.make({
  block: broaderModelRoot,
  container: null,
  // @ts-expect-error The public Model Schema must match the assembled Model exactly.
  routing: QueryRouting,
})

interface BroaderInitImplementation extends Omit<QueryImplementation, 'init'> {
  readonly init: (
    ...args: Parameters<QueryImplementation['init']>
  ) => Readonly<{ model: typeof QueryModel.Type | null }>
}
type BroaderInitRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  QueryMessageContract,
  BroaderInitImplementation,
  QueryRootChannels
>
const broaderInitRoot: BroaderInitRoot = QueryRoot
Program.make({
  block: broaderInitRoot,
  container: null,
  // @ts-expect-error An implementation annotation cannot widen the assembled init result.
  routing: QueryRouting,
})

interface BroaderUpdateImplementation extends Omit<
  QueryImplementation,
  'update'
> {
  readonly update: (
    ...args: Parameters<QueryImplementation['update']>
  ) => QueryUpdateResult | undefined
}
type BroaderUpdateRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  QueryMessageContract,
  BroaderUpdateImplementation,
  QueryRootChannels
>
const broaderUpdateRoot: BroaderUpdateRoot = QueryRoot
Program.make({
  block: broaderUpdateRoot,
  container: null,
  // @ts-expect-error An implementation annotation cannot widen the assembled update result.
  routing: QueryRouting,
})

type QueryOperationsImplementation = typeof queryOperationsImplementation
interface NarrowerOperationsImplementation extends Omit<
  QueryOperationsImplementation,
  'operations'
> {
  readonly operations: Readonly<{
    setQuery: (query: 'ready') => QueryOperationInput
  }>
}
type NarrowerOperationsRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  QueryMessageContract,
  NarrowerOperationsImplementation,
  QueryOperationsRootChannels
>
const narrowerOperationsRoot: NarrowerOperationsRoot = QueryOperationsRoot
Program.make({
  block: narrowerOperationsRoot,
  container: null,
  // @ts-expect-error Public operation inputs must match their assembled signatures exactly.
  routing: QueryRouting,
})

type QuerySurface = Pick<
  QueryRoot,
  'owner' | 'Model' | 'Message' | 'init' | 'update' | 'operations'
>
interface BroaderOwnerProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'owner'> {
  readonly owner: BroaderQueryOwner
}
interface BroaderModelProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'Model'> {
  readonly Model: BroaderQueryModel
}
interface BroaderMessageProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'Message'> {
  readonly Message: BroaderQueryMessage
}
interface BroaderInitProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'init'> {
  readonly init: BroaderInitRoot['init']
}
interface BroaderUpdateProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'update'> {
  readonly update: BroaderUpdateRoot['update']
}
type QueryOperationsSurface = Pick<
  QueryOperationsRoot,
  'owner' | 'Model' | 'Message' | 'init' | 'update' | 'operations'
>
interface NarrowerOperationsProjection
  extends
    Block.RootEvidence<QueryOperationsRootChannels>,
    Omit<QueryOperationsSurface, 'operations'> {
  readonly operations: NarrowerOperationsRoot['operations']
}
const broaderOwnerProjection: BroaderOwnerProjection = QueryRoot
const broaderModelProjection: BroaderModelProjection = QueryRoot
const broaderMessageProjection: BroaderMessageProjection = QueryRoot
const broaderInitProjection: BroaderInitProjection = QueryRoot
const broaderUpdateProjection: BroaderUpdateProjection = QueryRoot
const narrowerOperationsProjection: NarrowerOperationsProjection =
  QueryOperationsRoot
Program.make({
  block: broaderOwnerProjection,
  container: null,
  // @ts-expect-error Projected evidence cannot widen the assembled Owner.
  routing: QueryRouting,
})
Program.make({
  block: broaderModelProjection,
  container: null,
  // @ts-expect-error Projected evidence cannot widen the assembled Model Schema.
  routing: QueryRouting,
})
Program.make({
  block: broaderMessageProjection,
  container: null,
  // @ts-expect-error A projected Message Schema cannot authorize unsupported browser Messages.
  routing: navigationRouting,
})
Program.make({
  block: broaderInitProjection,
  container: null,
  // @ts-expect-error Projected evidence cannot widen the assembled init result.
  routing: QueryRouting,
})
Program.make({
  block: broaderUpdateProjection,
  container: null,
  // @ts-expect-error Projected evidence cannot widen the assembled update result.
  routing: QueryRouting,
})
Program.make({
  block: narrowerOperationsProjection,
  container: null,
  // @ts-expect-error Projected evidence cannot change assembled operation inputs.
  routing: QueryRouting,
})

// oxlint-disable-next-line typescript/no-explicit-any -- Deliberate decoded Model erasure.
type ErasedDecodedModel = Schema.Codec<any, typeof QueryModel.Encoded>
// oxlint-disable-next-line typescript/no-explicit-any -- Deliberate encoded Model erasure.
type ErasedEncodedModel = Schema.Codec<typeof QueryModel.Type, any>
// oxlint-disable-next-line typescript/no-explicit-any -- Deliberate decoded Message erasure.
type ErasedDecodedMessage = Schema.Codec<any, typeof QueryMessage.Encoded>
// oxlint-disable-next-line typescript/no-explicit-any -- Deliberate encoded Message erasure.
type ErasedEncodedMessage = Schema.Codec<typeof QueryMessage.Type, any>
type ErasedSurfaceValue = ErasedDecodedModel['Type']
type ErasedDecodedModelRoot = Block.Root<
  typeof QueryComposition.owner,
  ErasedDecodedModel,
  QueryMessageContract,
  QueryImplementation,
  QueryRootChannels
>
type ErasedEncodedModelRoot = Block.Root<
  typeof QueryComposition.owner,
  ErasedEncodedModel,
  QueryMessageContract,
  QueryImplementation,
  QueryRootChannels
>
type ErasedDecodedMessageRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  ErasedDecodedMessage,
  QueryImplementation,
  QueryRootChannels
>
type ErasedEncodedMessageRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  ErasedEncodedMessage,
  QueryImplementation,
  QueryRootChannels
>
const erasedDecodedModelRoot: ErasedDecodedModelRoot = QueryRoot
const erasedEncodedModelRoot: ErasedEncodedModelRoot = QueryRoot
const erasedDecodedMessageRoot: ErasedDecodedMessageRoot = QueryRoot
const erasedEncodedMessageRoot: ErasedEncodedMessageRoot = QueryRoot
Program.make({
  block: erasedDecodedModelRoot,
  container: null,
  // @ts-expect-error A Codec cannot erase the assembled decoded Model with nested any.
  routing: QueryRouting,
})
Program.make({
  block: erasedEncodedModelRoot,
  container: null,
  // @ts-expect-error A Codec cannot erase the assembled encoded Model with nested any.
  routing: QueryRouting,
})
Program.make({
  block: erasedDecodedMessageRoot,
  container: null,
  // @ts-expect-error A Codec cannot erase the assembled decoded Message with nested any.
  routing: QueryRouting,
})
Program.make({
  block: erasedEncodedMessageRoot,
  container: null,
  // @ts-expect-error A Codec cannot erase the assembled encoded Message with nested any.
  routing: QueryRouting,
})

interface ErasedInitParameterProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'init'> {
  readonly init: (url: ErasedSurfaceValue) => QueryInitResult
}
interface ErasedInitReturnProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'init'> {
  readonly init: (...args: Parameters<QueryRoot['init']>) => ErasedSurfaceValue
}
interface ErasedUpdateParameterProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'update'> {
  readonly update: (
    model: typeof QueryModel.Type,
    message: ErasedSurfaceValue,
  ) => QueryUpdateResult
}
interface ErasedUpdateReturnProjection
  extends Block.RootEvidence<QueryRootChannels>, Omit<QuerySurface, 'update'> {
  readonly update: (
    ...args: Parameters<QueryRoot['update']>
  ) => ErasedSurfaceValue
}
interface ErasedOperationProjection
  extends
    Block.RootEvidence<QueryOperationsRootChannels>,
    Omit<QueryOperationsSurface, 'operations'> {
  readonly operations: Readonly<{
    setQuery: ErasedSurfaceValue
  }>
}
interface ErasedOperationParameterProjection
  extends
    Block.RootEvidence<QueryOperationsRootChannels>,
    Omit<QueryOperationsSurface, 'operations'> {
  readonly operations: Readonly<{
    setQuery: (
      model: typeof QueryModel.Type,
      query: ErasedSurfaceValue,
    ) => QueryOperationResult
  }>
}
interface ErasedOperationReturnProjection
  extends
    Block.RootEvidence<QueryOperationsRootChannels>,
    Omit<QueryOperationsSurface, 'operations'> {
  readonly operations: Readonly<{
    setQuery: (
      ...args: Parameters<QueryOperationsRoot['operations']['setQuery']>
    ) => ErasedSurfaceValue
  }>
}
const erasedInitParameterProjection: ErasedInitParameterProjection = QueryRoot
const erasedInitReturnProjection: ErasedInitReturnProjection = QueryRoot
const erasedUpdateParameterProjection: ErasedUpdateParameterProjection =
  QueryRoot
const erasedUpdateReturnProjection: ErasedUpdateReturnProjection = QueryRoot
const erasedOperationProjection: ErasedOperationProjection = QueryOperationsRoot
const erasedOperationParameterProjection: ErasedOperationParameterProjection =
  QueryOperationsRoot
const erasedOperationReturnProjection: ErasedOperationReturnProjection =
  QueryOperationsRoot
Program.make({
  block: erasedInitParameterProjection,
  container: null,
  // @ts-expect-error A projected init parameter cannot erase its assembled URL input.
  routing: QueryRouting,
})
Program.make({
  block: erasedInitReturnProjection,
  container: null,
  // @ts-expect-error A projected init function cannot erase its assembled result.
  routing: QueryRouting,
})
Program.make({
  block: erasedUpdateParameterProjection,
  container: null,
  // @ts-expect-error A projected update parameter cannot erase its assembled Message.
  routing: QueryRouting,
})
Program.make({
  block: erasedUpdateReturnProjection,
  container: null,
  // @ts-expect-error A projected update function cannot erase its assembled result.
  routing: QueryRouting,
})
Program.make({
  block: erasedOperationProjection,
  container: null,
  // @ts-expect-error Exact evidence cannot authorize an any-erased operation signature.
  routing: QueryRouting,
})
Program.make({
  block: erasedOperationParameterProjection,
  container: null,
  // @ts-expect-error A projected operation cannot erase an assembled input parameter.
  routing: QueryRouting,
})
Program.make({
  block: erasedOperationReturnProjection,
  container: null,
  // @ts-expect-error A projected operation cannot erase its assembled result.
  routing: QueryRouting,
})

// A precise but invented runtime service must not be introduced by annotation.
// Otherwise provide(Layer.empty) wrongly removes the flags Effect's service.
class Missing extends Context.Service<Missing, Readonly<{ value: string }>>()(
  'RootBoundary/Missing',
) {}
const ProofComposition = Block.makeDefinition('RootBoundaryProof', {
  Model: Schema.Null,
  Message: Schema.Never,
}).makeComposition()
const proofImplementation = {
  init: (_flags: null) => ({ model: null }),
  update: ProofComposition.makeUpdate(),
  view: ProofComposition.makeView(() => null),
}
type ExactChannels = Block.RootChannelsFor<
  typeof ProofComposition,
  typeof proofImplementation
>
type ClaimedChannels = Omit<ExactChannels, 'runtimeServices'> &
  Readonly<{ runtimeServices: Missing }>
type ClaimedRoot = Block.Root<
  typeof ProofComposition.owner,
  typeof Schema.Null,
  typeof ProofComposition.Message,
  typeof proofImplementation,
  ClaimedChannels
>
// @ts-expect-error Root evidence cannot invent a runtime-provided service.
const claimedRuntimeRoot: ClaimedRoot =
  ProofComposition.assembleRoot(proofImplementation)
const falselyRunnable = Program.makeElement({
  block: claimedRuntimeRoot,
  container: null,
  Flags: Schema.Null,
  flags: Effect.as(Missing, null),
}).provide(Layer.empty)
const _falselyRunnableStart = falselyRunnable.start()

const optionalEffectsLayerImplementation: typeof minimalImplementation &
  Readonly<{ EffectsLayer?: Layer.Layer<never, never, Missing> }> = {
  ...minimalImplementation,
  EffectsLayer: Layer.effectDiscard(Missing),
}
// @ts-expect-error An optional recipe annotation cannot silently discard its actual Missing input.
MinimalComposition.assembleRoot(optionalEffectsLayerImplementation)

const optionalEmptyRecipe: typeof minimalImplementation &
  Readonly<{ EffectsLayer?: typeof Layer.empty }> = {
  ...minimalImplementation,
  EffectsLayer: Layer.empty,
}
// @ts-expect-error Present-but-optional recipe annotations are not the omitted recipe overload.
MinimalComposition.assembleRoot(optionalEmptyRecipe)

const maybeUndefinedRecipe: typeof minimalImplementation &
  Readonly<{ EffectsLayer: Layer.Layer<never, never, Missing> | undefined }> = {
  ...minimalImplementation,
  EffectsLayer: Layer.effectDiscard(Missing),
}
// @ts-expect-error A required possibly-undefined recipe must not normalize its Missing input to empty.
MinimalComposition.assembleRoot(maybeUndefinedRecipe)

const maybeOptionalRecipe =
  globalThis.Math.random() > 0.5
    ? { ...minimalImplementation, EffectsLayer: Layer.empty }
    : optionalEffectsLayerImplementation
// @ts-expect-error An exact branch cannot conceal another branch's optional recipe.
MinimalComposition.assembleRoot(maybeOptionalRecipe)

const optionalSubscriptions: Omit<
  typeof lifecycleImplementation,
  'subscriptions'
> &
  Readonly<{ subscriptions?: typeof lifecycleImplementation.subscriptions }> =
  lifecycleImplementation
// @ts-expect-error Optional subscription registration cannot be normalized to an empty registry.
LifecycleComposition.assembleRoot(optionalSubscriptions)

const optionalManagedResources: Omit<
  typeof lifecycleImplementation,
  'managedResources'
> &
  Readonly<{
    managedResources?: typeof lifecycleImplementation.managedResources
  }> = lifecycleImplementation
// @ts-expect-error Optional managed resources cannot lose their live registration and service evidence.
LifecycleComposition.assembleRoot(optionalManagedResources)

const optionalOperations: Omit<typeof implementation, 'operations'> &
  Readonly<{ operations?: typeof implementation.operations }> = implementation
// @ts-expect-error Optional operation annotations cannot erase real service-requiring operations.
RootBoundaryComposition.assembleRoot(optionalOperations)

const optionalHostHandlers: typeof implementation &
  Readonly<{ hostHandlers?: readonly [typeof Load] }> = {
  ...implementation,
  hostHandlers: [Load],
}
// @ts-expect-error Terminal completion cannot overlook a potentially present host-delegation contract.
RootBoundaryComposition.assembleRoot(optionalHostHandlers)

const requiredEffectsLayerImplementation = {
  ...minimalImplementation,
  EffectsLayer: Layer.effectDiscard(Missing),
}
type WithoutEffectsLayer = Omit<
  typeof requiredEffectsLayerImplementation,
  'EffectsLayer'
>
MinimalComposition.assembleRoot<WithoutEffectsLayer>(
  // @ts-expect-error Explicit type arguments cannot omit a real recipe requiring Missing.
  requiredEffectsLayerImplementation,
)

type SelectedRecipeUnion =
  | typeof minimalImplementation
  | (typeof minimalImplementation &
      Readonly<{ EffectsLayer: typeof Layer.empty }>)
MinimalComposition.assembleRoot<SelectedRecipeUnion>(
  // @ts-expect-error A selected omission branch cannot hide a recipe outside its selected Layer types.
  requiredEffectsLayerImplementation,
)

type WithoutOperations = Omit<typeof implementation, 'operations'>
RootBoundaryComposition.assembleRoot<WithoutOperations>(
  // @ts-expect-error Explicit type arguments cannot erase real exposed operations.
  implementation,
)

type WithoutSubscriptions = Omit<
  typeof lifecycleImplementation,
  'subscriptions'
>
LifecycleComposition.assembleRoot<WithoutSubscriptions>(
  // @ts-expect-error Explicit type arguments cannot hide a live subscription registry.
  lifecycleImplementation,
)

type WithoutManagedResources = Omit<
  typeof lifecycleImplementation,
  'managedResources'
>
LifecycleComposition.assembleRoot<WithoutManagedResources>(
  // @ts-expect-error Explicit type arguments cannot hide live managed resources.
  lifecycleImplementation,
)

const requiredHostHandlersImplementation: typeof implementation &
  Readonly<{ hostHandlers: readonly [typeof Load] }> = {
  ...implementation,
  hostHandlers: [Load],
}
type WithoutHostHandlers = Omit<
  typeof requiredHostHandlersImplementation,
  'hostHandlers'
>
RootBoundaryComposition.assembleRoot<WithoutHostHandlers>(
  // @ts-expect-error Explicit type arguments cannot conceal a real host-delegation contract.
  requiredHostHandlersImplementation,
)

// @ts-expect-error An ordinary service required by the selected handler Layer remains pending.
PendingElement.start()
// @ts-expect-error Matching Layer outputs do not erase that Layer's construction inputs.
PendingLayerInput.start()
// @ts-expect-error Providing nothing cannot satisfy an outstanding service.
PendingElement.provide(Layer.empty).start()

export const rejectOrdinaryResourceUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionUnregisteredBlock,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error One alternative's resource cannot satisfy the other alternative's requirement.
  pending.start()
}
export const rejectRootResourceUnion = (
  block: typeof UnionRegisteredRoot | typeof UnionUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error A terminal-root union still requires the unregistered alternative's resource.
  pending.start()
}
export const rejectMixedResourceUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error An ordinary Block's resource is not installed by the selected terminal root.
  pending.start()
}
export const rejectReverseMixedResourceUnion = (
  block: typeof UnionRegisteredRoot | typeof UnionUnregisteredBlock,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error A terminal root's resource is not installed by the selected ordinary Block.
  pending.start()
}
export const rejectResourceUnionLayerInput = (
  block: typeof UnionRegisteredBlock | typeof UnionUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null })
    .provide(UnionSessionReaderLayer)
    .provide(Layer.empty)
  // @ts-expect-error A provider's resource input must also be installed by every selected alternative.
  pending.start()
}
export const rejectRegisteredUnionEffectInput = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationRoot,
) => {
  const pending = Program.makeElement({ block, container: null })
    .provide(Layer.effectDiscard(StoreConfig))
    .provide(Layer.empty)
  // @ts-expect-error Guaranteed resource registration cannot erase an ordinary Effect service input.
  pending.start()
}

export const rejectDifferentResourcePlacementUnion = (
  block:
    | typeof UnionKeyedRegisteredBlock
    | typeof UnionKeyedOtherPlacementBlock,
  layer: Layer.Layer<never, never, UnionKeyedSession>,
) => {
  const pending = Program.makeElement({ block, container: null })
    .provide(layer)
    .provide(Layer.empty)
  // @ts-expect-error A different child placement does not provide this scoped resource capability.
  pending.start()
}

// @ts-expect-error Root completion requires every local handler to be provided.
RootBoundaryComposition.assembleRoot({
  ...implementation,
  EffectsLayer: Layer.empty,
})
// @ts-expect-error A terminal root cannot delegate its missing handler to a host.
RootBoundaryComposition.assembleRoot({
  ...implementation,
  EffectsLayer: Layer.empty,
  hostHandlers: [Load],
})
// @ts-expect-error Literal instantiation must revalidate a generic owner's missing handler.
GenericParts.composition.assembleRoot({
  ...GenericParts.implementation,
  EffectsLayer: Layer.empty,
})

const requiredContextImplementation = {
  ...implementation,
  update: RootBoundaryComposition.makeUpdate(
    (model, _message, _required: Readonly<{ tenant: string }>) => ({ model }),
  ),
}
// @ts-expect-error A terminal root cannot require dispatch Context.
RootBoundaryComposition.assembleRoot(requiredContextImplementation)
const RootOutMessage = MessageModule.defineMessageUnion({ CompletedRoot: {} })
const OutMessageComposition = Block.makeDefinition('RootBoundaryOutMessage', {
  Model,
  Message,
  OutMessage: RootOutMessage,
}).makeComposition()
const outMessageImplementation = {
  init: implementation.init,
  update: OutMessageComposition.makeUpdate(model => ({ model })),
  view: OutMessageComposition.makeView(model => ({
    title: globalThis.String(model.count),
    body: null,
  })),
}
// @ts-expect-error Declaring an OutMessage is invalid even if this update never emits one.
OutMessageComposition.assembleRoot(outMessageImplementation)

const unownedViewImplementation = {
  ...implementation,
  view: () => ({ title: 'Unowned', body: null }),
}
// @ts-expect-error A terminal root still requires a Composition-authored default view.
RootBoundaryComposition.assembleRoot(unownedViewImplementation)
const ForeignComposition = Block.makeDefinition('RootBoundaryForeignView', {
  Model,
  Message,
}).makeComposition()
const foreignViewImplementation = {
  ...implementation,
  view: ForeignComposition.makeView((_model, h) => h.main([])),
}
// @ts-expect-error Another owner's authored view cannot become this root's default view.
RootBoundaryComposition.assembleRoot(foreignViewImplementation)
const inputViewImplementation = {
  ...implementation,
  view: RootBoundaryComposition.makeView.withInputs<
    Readonly<{ label: string }>
  >((_model, inputs, h) => h.main([], [inputs.label])),
}
// @ts-expect-error A terminal root view cannot require unprovided view inputs.
RootBoundaryComposition.assembleRoot(inputViewImplementation)

// @ts-expect-error The projected root retains its Element default view.
Program.make({ block: ApplicationRoot, container: null })
// @ts-expect-error A Document root cannot be hosted by makeElement.
Program.makeElement({ block: DocumentRoot, container: null })
const MaybeDocumentRoot =
  globalThis.Math.random() > 0.5 ? ApplicationRoot : DocumentRoot
// @ts-expect-error Every member of a terminal root union must have the requested view kind.
Program.makeElement({ block: MaybeDocumentRoot, container: null })
const WrongFlags = Schema.Struct({ count: Schema.Number })
// @ts-expect-error Flags must exactly match the root initializer, not only be a valid Schema.
Program.makeElement({
  block: FlagsRoot,
  container: null,
  Flags: WrongFlags,
  flags: Effect.succeed(WrongFlags.make({ count: 0 })),
})
const InvalidInitRoot = RootBoundaryComposition.assembleRoot({
  ...implementation,
  init: (_url: Url.Url, _unexpected: string) => ({
    model: Model.make({ count: Count.make(0) }),
  }),
})
// @ts-expect-error Terminal projection cannot hide an unsupported root initialization tuple.
Program.makeElement({ block: InvalidInitRoot, container: null })

const StaleNodeBinding = RootBoundaryNestedDefinition.makeBinding(NodeBlock, {
  field: 'node',
  placement: 'replacementNode',
  init: false,
})
const StaleComposition = RootBoundaryNestedDefinition.makeComposition({
  bindings: [StaleNodeBinding],
})
const staleImplementation = {
  ...nestedImplementation,
  view: StaleComposition.makeView(model => ({
    title: globalThis.String(model.node.leaf.count),
    body: null,
  })),
}
// @ts-expect-error A replacement graph cannot trust the original nested binding's operations.
StaleComposition.assembleRoot(staleImplementation)
const OmittedComposition = RootBoundaryNestedDefinition.makeComposition()
const omittedImplementation = {
  ...nestedImplementation,
  view: OmittedComposition.makeView(() => ({ title: 'Omitted', body: null })),
}
// @ts-expect-error Root completion must check raw registrations before normalizing producers.
OmittedComposition.assembleRoot(omittedImplementation)
const StaleLeafBinding = RootBoundaryNodeDefinition.makeBinding(LeafBlock, {
  field: 'leaf',
  placement: 'replacementLeaf',
  init: false,
  delivery: { toUpdateContext: () => [] },
})
const StaleLeafComposition = RootBoundaryNodeDefinition.makeComposition({
  bindings: [StaleLeafBinding],
})
const staleLeafImplementation = {
  ...nodeImplementation,
  view: StaleLeafComposition.makeView(model => ({
    title: globalThis.String(model.leaf.count),
    body: null,
  })),
}
// @ts-expect-error Promoting a nested node to a root must validate its stale descendant registration.
StaleLeafComposition.assembleRoot(staleLeafImplementation)

const model = ApplicationRoot.init().model
ApplicationRoot.operations.load(model, 'Primary', 'keyboard')
// @ts-expect-error Exposed root operations retain refined argument literals.
ApplicationRoot.operations.load(model, 'Other')
// @ts-expect-error Exposed root operations retain the optional dispatch Context's refinement.
ApplicationRoot.operations.load(model, 'Primary', 'background')
ApplicationRoot.update(
  model,
  Message.RequestedLoad({ key: 'Primary' }),
  // @ts-expect-error The public update retains its refined optional Context.
  'background',
)
// @ts-expect-error The public Model still requires its branded decoded count.
ApplicationRoot.Model.make({ count: 1 })

type Surface = Pick<
  ApplicationRoot,
  'owner' | 'Model' | 'Message' | 'init' | 'update' | 'operations'
>
export const rejectUnknownProof = (
  root: Surface & Block.RootEvidence<unknown>,
) => {
  // @ts-expect-error Unknown evidence is not an exact assembly proof.
  Program.makeElement({ block: root, container: null })
}
export const rejectAnyProof = (
  // oxlint-disable-next-line typescript/no-explicit-any -- Deliberate erased-proof rejection.
  root: Surface & Block.RootEvidence<any>,
) => {
  // @ts-expect-error Any evidence cannot bypass root channel precision checks.
  Program.makeElement({ block: root, container: null })
}
export const rejectNeverProof = (root: Surface & Block.RootEvidence<never>) => {
  // @ts-expect-error Never evidence is not a valid completed root.
  Program.makeElement({ block: root, container: null })
}
type ErasedRequirementChannels<Requirements> = Omit<
  ApplicationRootChannels,
  'requirements' | 'operationRequirements'
> &
  Readonly<{
    requirements: Requirements
    operationRequirements: Requirements
  }>
export const rejectErasedRequirements = (
  unknownRequirements: Surface &
    Block.RootEvidence<ErasedRequirementChannels<unknown>>,
  // oxlint-disable-next-line typescript/no-explicit-any -- Isolate requirement precision from handler precision.
  anyRequirements: Surface & Block.RootEvidence<ErasedRequirementChannels<any>>,
) => {
  // @ts-expect-error Exact handler evidence cannot make unknown ordinary requirements safe.
  Program.makeElement({ block: unknownRequirements, container: null })
  // @ts-expect-error Exact handler evidence cannot make any-erased ordinary requirements safe.
  Program.makeElement({ block: anyRequirements, container: null })
}
// @ts-expect-error A genuine assembled root cannot be annotated with impossible evidence.
const impossibleProof: Surface & Block.RootEvidence<never> = ApplicationRoot

type RequirementFreeChannels = Omit<
  ApplicationRootChannels,
  'requirements' | 'operationRequirements'
> &
  Readonly<{ requirements: never; operationRequirements: never }>
type RequirementFreeRoot = Block.Root<
  typeof RootBoundaryDefinition.owner,
  typeof Model,
  ApplicationMessage,
  typeof implementation,
  RequirementFreeChannels
>
// @ts-expect-error An annotation cannot erase real operation and ordinary-service requirements.
const requirementFree: RequirementFreeRoot = ApplicationRoot
type WrongViewChannels = Omit<ApplicationRootChannels, 'defaultView'> &
  Readonly<{ defaultView: typeof documentView }>
// @ts-expect-error A correct public surface cannot carry another default-view proof.
const wrongEvidence: Surface & Block.RootEvidence<WrongViewChannels> =
  ApplicationRoot
const spreadRoot = { ...ApplicationRoot }
// @ts-expect-error Object spread does not retain the nominal completed-root proof.
Program.makeElement({ block: spreadRoot, container: null })
const mappedRoot: { [Field in keyof ApplicationRoot]: ApplicationRoot[Field] } =
  ApplicationRoot
// @ts-expect-error Public-field widening cannot manufacture the nominal root proof.
Program.makeElement({ block: mappedRoot, container: null })
const replacedRoot = { ...ApplicationRoot, init: () => ({ model }) }
// @ts-expect-error Replacing implementation fields on a spread is not root assembly.
Program.makeElement({ block: replacedRoot, container: null })
const RootBoundaryParentDefinition = Block.makeDefinition(
  'RootBoundaryParent',
  {
    Model: Schema.Struct({ child: Model }),
    Message: Schema.Never,
  },
)
// @ts-expect-error A terminal root is not an ordinary child Block.
RootBoundaryParentDefinition.makeBinding(ApplicationRoot, { field: 'child' })

void [impossibleProof, requirementFree, wrongEvidence]
type RootOwner = typeof RootBoundaryDefinition.owner

// Invalid unknown and mixed parameters fail at Root's public constraints;
// they must not become partially usable roots through conditional filtering.
export type UnknownOwnerRoot = Block.Root<
  // @ts-expect-error Root requires an Owner rather than unknown.
  unknown,
  typeof Model,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type UnknownModelRoot = Block.Root<
  RootOwner,
  // @ts-expect-error Root requires a Model Schema rather than unknown.
  unknown,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type UnknownMessageRoot = Block.Root<
  RootOwner,
  typeof Model,
  // @ts-expect-error Root requires a Message Schema rather than unknown.
  unknown,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type UnknownImplementationRoot = Block.Root<
  RootOwner,
  typeof Model,
  ApplicationMessage,
  // @ts-expect-error Root requires an implementation with init and update.
  unknown,
  ApplicationRootChannels
>
export type MixedOwnerRoot = Block.Root<
  // @ts-expect-error Every Owner union member must satisfy the public constraint.
  RootOwner | undefined,
  typeof Model,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type MixedModelRoot = Block.Root<
  RootOwner,
  // @ts-expect-error Every Model union member must be a Schema.
  typeof Model | undefined,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type MixedMessageRoot = Block.Root<
  RootOwner,
  typeof Model,
  // @ts-expect-error Every Message union member must be a Schema.
  ApplicationMessage | undefined,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type MixedImplementationRoot = Block.Root<
  RootOwner,
  typeof Model,
  ApplicationMessage,
  // @ts-expect-error Every implementation union member must retain update.
  ApplicationImplementation | Readonly<{ init: typeof implementation.init }>,
  ApplicationRootChannels
>

// Never satisfies generic constraints; the validated consumer must reject the
// impossible surface rather than trusting its otherwise precise channel proof.
export const rejectNeverRootParameters = (
  owner: Block.Root<
    never,
    typeof Model,
    ApplicationMessage,
    ApplicationImplementation,
    ApplicationRootChannels
  >,
  model: Block.Root<
    RootOwner,
    never,
    ApplicationMessage,
    ApplicationImplementation,
    ApplicationRootChannels
  >,
  message: Block.Root<
    RootOwner,
    typeof Model,
    never,
    ApplicationImplementation,
    ApplicationRootChannels
  >,
  implementationValue: Block.Root<
    RootOwner,
    typeof Model,
    ApplicationMessage,
    never,
    ApplicationRootChannels
  >,
) => {
  // @ts-expect-error An explicit never Owner cannot manufacture a completed root.
  Program.makeElement({ block: owner, container: null })
  // @ts-expect-error An explicit never Model Schema is not root evidence.
  Program.makeElement({ block: model, container: null })
  // @ts-expect-error An explicit never Message Schema is not root evidence.
  Program.makeElement({ block: message, container: null })
  // @ts-expect-error An explicit never implementation is not a completed root.
  Program.makeElement({ block: implementationValue, container: null })
}

export const rejectAnyRootParameters = (
  // oxlint-disable-next-line typescript/no-explicit-any -- Deliberate Owner erasure.
  owner: Block.Root<
    any,
    typeof Model,
    ApplicationMessage,
    ApplicationImplementation,
    ApplicationRootChannels
  >,
  // oxlint-disable-next-line typescript/no-explicit-any -- Deliberate Model Schema erasure.
  model: Block.Root<
    RootOwner,
    any,
    ApplicationMessage,
    ApplicationImplementation,
    ApplicationRootChannels
  >,
  // oxlint-disable-next-line typescript/no-explicit-any -- Deliberate Message Schema erasure.
  message: Block.Root<
    RootOwner,
    typeof Model,
    any,
    ApplicationImplementation,
    ApplicationRootChannels
  >,
  // oxlint-disable-next-line typescript/no-explicit-any -- Deliberate implementation erasure.
  implementationValue: Block.Root<
    RootOwner,
    typeof Model,
    ApplicationMessage,
    any,
    ApplicationRootChannels
  >,
) => {
  // @ts-expect-error Any Owner evidence is not a completed root identity.
  Program.makeElement({ block: owner, container: null })
  // @ts-expect-error Any Model Schema evidence cannot reach the validated Program boundary.
  Program.makeElement({ block: model, container: null })
  // @ts-expect-error Any Message Schema evidence cannot reach the validated Program boundary.
  Program.makeElement({ block: message, container: null })
  // @ts-expect-error Any implementation evidence cannot reach the validated Program boundary.
  Program.makeElement({ block: implementationValue, container: null })
}
