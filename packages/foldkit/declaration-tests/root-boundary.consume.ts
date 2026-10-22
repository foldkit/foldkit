import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import * as Server from 'foldkit/experimental/server'
import * as Program from 'foldkit/program'
import type * as Update from 'foldkit/update'
import type * as Url from 'foldkit/url'

import {
  type ApplicationImplementation,
  type ApplicationMessage,
  ApplicationRoot,
  type ApplicationRootChannels,
  Count,
  DecodeCount,
  DocumentRoot,
  EmptyRecipeRoot,
  EncodeCount,
  type Equal,
  type Expect,
  Flags,
  FlagsRoot,
  type Key,
  LeafBlock,
  LifecycleRoot,
  Load,
  Message,
  Model,
  NestedRoot,
  OmittedRecipeRoot,
  type ProjectedQueryRoot,
  type ProjectedRoot,
  QueryComposition,
  type QueryImplementation,
  QueryMessage,
  type QueryMessageContract,
  QueryModel,
  QueryOperationsRoot,
  QueryRoot,
  type QueryRootChannels,
  QueryRouting,
  RequiredRecipeRoot,
  RootBoundaryDefinition,
  type Source,
  Store,
  StoreConfig,
  StoreConfigLayer,
  StoreUnavailable,
  SuppliedRoot,
  type SuppliedRootChannels,
  UnionKeyedOtherPlacementBlock,
  UnionKeyedRegisteredBlock,
  UnionKeyedRegisteredRoot,
  type UnionKeyedSession,
  UnionKeyedUnregisteredRoot,
  UnionRegisteredBlock,
  UnionRegisteredRoot,
  UnionRenamedRegistrationBlock,
  UnionRenamedRegistrationRoot,
  UnionSessionReaderLayer,
  UnionUnregisteredBlock,
  UnionUnregisteredRoot,
  makeGenericRootParts,
  queryImplementation,
} from './root-boundary.accepted.js'

type RelocatedQueryRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  QueryMessageContract,
  QueryImplementation,
  QueryRootChannels
>
const queryRoot: RelocatedQueryRoot = QueryRoot
const projectedQueryRoot: ProjectedQueryRoot = queryRoot
const preciseQueryRoot: QueryRoot = projectedQueryRoot
export const relocatedQueryProgram = Program.make({
  block: queryRoot,
  container: null,
  routing: QueryRouting,
})
export const relocatedProjectedQueryProgram = Program.make({
  block: projectedQueryRoot,
  container: null,
  routing: QueryRouting,
})
export const relocatedQueryOperationsProgram = Program.make({
  block: QueryOperationsRoot,
  container: null,
  routing: QueryRouting,
})
export const startRelocatedQueryProgram = relocatedQueryProgram.start
export const startRelocatedProjectedQueryProgram =
  relocatedProjectedQueryProgram.start
export const startRelocatedQueryOperationsProgram =
  relocatedQueryOperationsProgram.start

export type RelocatedQueryRootAssertions = [
  Expect<Equal<typeof relocatedQueryProgram, Program.Program>>,
  Expect<Equal<typeof relocatedProjectedQueryProgram, Program.Program>>,
  Expect<Equal<typeof relocatedQueryOperationsProgram, Program.Program>>,
  Expect<Equal<typeof preciseQueryRoot, QueryRoot>>,
  Expect<Equal<typeof queryRoot.owner, typeof QueryComposition.owner>>,
  Expect<Equal<typeof queryRoot.Model, typeof QueryModel>>,
  Expect<Equal<typeof queryRoot.Model.Type, Readonly<{ length: number }>>>,
  Expect<Equal<typeof queryRoot.Model.Encoded, Readonly<{ length: number }>>>,
  Expect<Equal<typeof queryRoot.Model.DecodingServices, never>>,
  Expect<Equal<typeof queryRoot.Model.EncodingServices, never>>,
  Expect<Equal<typeof queryRoot.Message, QueryMessageContract>>,
  Expect<Equal<typeof queryRoot.Message.Type, typeof QueryMessage.Type>>,
  Expect<Equal<typeof queryRoot.Message.Encoded, typeof QueryMessage.Encoded>>,
  Expect<Equal<typeof queryRoot.Message.DecodingServices, never>>,
  Expect<Equal<typeof queryRoot.Message.EncodingServices, never>>,
  Expect<Equal<typeof queryRoot.init, typeof queryImplementation.init>>,
  Expect<Equal<typeof queryRoot.update, typeof queryImplementation.update>>,
  Expect<Equal<Parameters<typeof queryRoot.init>, [url: Url.Url]>>,
  Expect<Equal<ProjectedQueryRoot['owner'], QueryRoot['owner']>>,
  Expect<Equal<ProjectedQueryRoot['Model'], QueryRoot['Model']>>,
  Expect<Equal<ProjectedQueryRoot['Message'], QueryRoot['Message']>>,
  Expect<Equal<ProjectedQueryRoot['init'], QueryRoot['init']>>,
  Expect<Equal<ProjectedQueryRoot['update'], QueryRoot['update']>>,
  Expect<Equal<ProjectedQueryRoot['operations'], QueryRoot['operations']>>,
  Expect<
    Equal<
      Parameters<typeof QueryOperationsRoot.operations.setQuery>,
      [model: typeof QueryModel.Type, query: string]
    >
  >,
]

// The emitted named implementation carries exact member types through the
// ordinary generic Root contract without repeating its six public fields.
type RelocatedRoot = Block.Root<
  typeof RootBoundaryDefinition.owner,
  typeof Model,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>
const root: RelocatedRoot = ApplicationRoot
type OrdinaryLoadParameters = Parameters<typeof LeafBlock.operations.load>
type OrdinaryUpdateParameters = Parameters<typeof LeafBlock.update>
const precise: ApplicationRoot = root
const model = root.init().model
root.operations.load(model, 'Primary', 'keyboard')
root.update(model, Message.CompletedLoad({ count: Count.make(1) }), 'toolbar')
const codec: Schema.Codec<
  Readonly<{ count: typeof Count.Type }>,
  Readonly<{ count: string }>,
  DecodeCount,
  EncodeCount
> = root.Model
void [precise, codec]

const projected: ProjectedRoot = root
const projectedProgram = Program.makeElement({
  block: projected,
  container: null,
})
const pending = Program.makeElement({ block: root, container: null })
// @ts-expect-error The relocated projection still requires its handler's Store service.
pending.start()
const provided = pending.provide(
  Layer.succeed(Store, { load: key => Effect.succeed(key.length) }),
)
export const startProvided = provided.start
const pendingInput = Program.makeElement({
  block: SuppliedRoot,
  container: null,
})
// @ts-expect-error Relocation cannot erase a selected Layer's construction input.
pendingInput.start()
const providedInput = pendingInput.provide(StoreConfigLayer)
export const startProvidedInput = providedInput.start

const dispatch = Program.makeElement({
  block: root,
  container: null,
  devTools: { dispatch: true },
})
const providedStoreOnly = dispatch.provide(
  Layer.succeed(Store, { load: key => Effect.succeed(key.length) }),
)
// @ts-expect-error Providing the operation's Store does not provide the Message decoder.
providedStoreOnly.start()
const providedDispatch = providedStoreOnly.provide(
  Layer.succeed(DecodeCount, { parse: value => globalThis.Number(value) }),
)
export const startProvidedDispatch = providedDispatch.start

export const relocatedOmittedRecipe = Program.makeElement({
  block: OmittedRecipeRoot,
  container: null,
})
export const relocatedEmptyRecipe = Program.makeElement({
  block: EmptyRecipeRoot,
  container: null,
})
export const relocatedRequiredRecipe = Program.makeElement({
  block: RequiredRecipeRoot,
  container: null,
})
export const startRelocatedOmittedRecipe = relocatedOmittedRecipe.start
export const startRelocatedEmptyRecipe = relocatedEmptyRecipe.start
// @ts-expect-error A required recipe's real construction dependency survives declaration relocation.
relocatedRequiredRecipe.start()
export const startRelocatedRequiredRecipe =
  relocatedRequiredRecipe.provide(StoreConfigLayer).start
export const relocatedLifecycle = Program.makeElement({
  block: LifecycleRoot,
  container: null,
})
// @ts-expect-error Lifecycle registry handlers still require their ordinary construction service.
relocatedLifecycle.start()
export const startRelocatedLifecycle =
  relocatedLifecycle.provide(StoreConfigLayer).start

export const rejectRelocatedOrdinaryResourceUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionUnregisteredBlock,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error Emission cannot make one alternative's resource available to every alternative.
  pending.start()
}
export const rejectRelocatedRootResourceUnion = (
  block: typeof UnionRegisteredRoot | typeof UnionUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error The unregistered terminal-root alternative remains pending after relocation.
  pending.start()
}
export const rejectRelocatedMixedResourceUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error Relocation cannot supply an ordinary Block's resource to a terminal-root alternative.
  pending.start()
}
export const rejectRelocatedReverseMixedResourceUnion = (
  block: typeof UnionRegisteredRoot | typeof UnionUnregisteredBlock,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error Relocation cannot supply a terminal root's resource to an ordinary-Block alternative.
  pending.start()
}
export const rejectRelocatedResourceUnionLayerInput = (
  block: typeof UnionRegisteredBlock | typeof UnionUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null })
    .provide(UnionSessionReaderLayer)
    .provide(Layer.empty)
  // @ts-expect-error The selected provider's resource input remains a real dependency after relocation.
  pending.start()
}
export const rejectRelocatedRegisteredUnionEffectInput = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationRoot,
) => {
  const pending = Program.makeElement({ block, container: null })
    .provide(Layer.effectDiscard(StoreConfig))
    .provide(Layer.empty)
  // @ts-expect-error Emitted guaranteed-resource evidence cannot erase an ordinary Effect input.
  pending.start()
}
export const startRelocatedOrdinaryRegisteredUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationBlock,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(UnionSessionReaderLayer).start
export const startRelocatedRootRegisteredUnion = (
  block: typeof UnionRegisteredRoot | typeof UnionRenamedRegistrationRoot,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(UnionSessionReaderLayer).start
export const startRelocatedMixedRegisteredUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationRoot,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(UnionSessionReaderLayer).start
export const startRelocatedRegisteredUnionWithProvidedService = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationRoot,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.effectDiscard(StoreConfig))
    .provide(StoreConfigLayer).start

export const startRelocatedResourceUnionWithProvider = (
  block:
    | typeof UnionRegisteredBlock
    | typeof UnionUnregisteredBlock
    | typeof UnionRegisteredRoot
    | typeof UnionUnregisteredRoot,
  layer: Layer.Layer<Layer.Services<typeof UnionSessionReaderLayer>>,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(layer).start
export const rejectRelocatedKeyedResourceUnion = (
  block: typeof UnionKeyedRegisteredRoot | typeof UnionKeyedUnregisteredRoot,
) => {
  const pending = Program.makeElement({ block, container: null }).provide(
    Layer.empty,
  )
  // @ts-expect-error Relocated keyed descendants remain unavailable on an unregistered alternative.
  pending.start()
}
export const rejectRelocatedDifferentResourcePlacementUnion = (
  block:
    | typeof UnionKeyedRegisteredBlock
    | typeof UnionKeyedOtherPlacementBlock,
  layer: Layer.Layer<never, never, UnionKeyedSession>,
) => {
  const pending = Program.makeElement({ block, container: null })
    .provide(layer)
    .provide(Layer.empty)
  // @ts-expect-error Emission cannot collapse distinct scoped resource placements.
  pending.start()
}
export const startRelocatedKeyedRegisteredUnion = (
  block: typeof UnionKeyedRegisteredBlock | typeof UnionKeyedRegisteredRoot,
  layer: Layer.Layer<never, never, UnionKeyedSession>,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(layer).start

export const relocatedFlags = Program.makeElement({
  block: FlagsRoot,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ name: 'relocated' })),
})
export const relocatedDocument = Program.make({
  block: DocumentRoot,
  container: null,
})
export const relocatedRender = () =>
  Server.renderToString(DocumentRoot, {}, { isHydratable: false })
export const relocatedNested = Program.make({
  block: NestedRoot,
  container: null,
})
// @ts-expect-error Descendant ordinary services remain pending after relocation.
relocatedNested.start()

// Call the emitted generic factory rather than merely consuming an already
// completed producer. Concrete completion must retain deferred validation.
const parts = makeGenericRootParts('RootBoundaryRelocatedGeneric')
const genericRoot = parts.composition.assembleRoot(parts.implementation)
const genericElement = Program.makeElement({
  block: genericRoot,
  container: null,
})
// @ts-expect-error A relocated generic owner's missing handler is still invalid.
parts.composition.assembleRoot({
  ...parts.implementation,
  EffectsLayer: Layer.empty,
})
// @ts-expect-error Generic completion cannot erase its ordinary construction service.
genericElement.start()

type EncodedMessage =
  | Readonly<{ _tag: 'RequestedLoad'; key: 'Primary' | 'Secondary' }>
  | Readonly<{ _tag: 'CompletedLoad'; count: string }>
export type RelocatedRootAssertions = [
  Expect<Equal<typeof relocatedOmittedRecipe, Program.Element>>,
  Expect<Equal<typeof relocatedEmptyRecipe, Program.Element>>,
  Expect<
    Equal<
      typeof relocatedRequiredRecipe,
      Program.Pending<undefined, void, StoreConfig, never, never, 'Element'>
    >
  >,
  Expect<Equal<typeof root.Model.Type, Readonly<{ count: typeof Count.Type }>>>,
  Expect<Equal<typeof root.Model.Encoded, Readonly<{ count: string }>>>,
  Expect<Equal<typeof root.Model.DecodingServices, DecodeCount>>,
  Expect<Equal<typeof root.Model.EncodingServices, EncodeCount>>,
  Expect<Equal<typeof root.Message.Type, typeof Message.Type>>,
  Expect<Equal<typeof root.Message.Encoded, EncodedMessage>>,
  Expect<Equal<typeof root.Message.DecodingServices, DecodeCount>>,
  Expect<Equal<typeof root.Message.EncodingServices, EncodeCount>>,
  Expect<
    Equal<
      OrdinaryLoadParameters,
      [model: typeof Model.Type, key: Key, source?: Source | undefined]
    >
  >,
  Expect<
    Equal<
      OrdinaryUpdateParameters,
      [
        model: typeof Model.Type,
        message: typeof Message.Type,
        source?: Source | undefined,
      ]
    >
  >,
  Expect<
    Equal<Parameters<typeof root.operations.load>, OrdinaryLoadParameters>
  >,
  Expect<Equal<Parameters<typeof root.update>, OrdinaryUpdateParameters>>,
  Expect<
    Equal<
      Update.RequirementsOf<typeof root.operations.load>,
      Command.HandlerOf<typeof Load>
    >
  >,
  Expect<
    Equal<Layer.Services<SuppliedRootChannels['EffectsLayer']>, StoreConfig>
  >,
  Expect<
    Equal<
      Layer.Success<SuppliedRootChannels['EffectsLayer']>,
      Store | Command.HandlerOf<typeof Load>
    >
  >,
  Expect<
    Equal<Layer.Error<SuppliedRootChannels['EffectsLayer']>, StoreUnavailable>
  >,
  Expect<
    Equal<
      typeof projectedProgram,
      Program.Pending<
        undefined,
        void,
        Store,
        never,
        Command.HandlerOf<typeof Load>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof pending,
      Program.Pending<
        undefined,
        void,
        Store,
        never,
        Command.HandlerOf<typeof Load>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof provided,
      Program.Element<
        undefined,
        never,
        never,
        Store | Command.HandlerOf<typeof Load>
      >
    >
  >,
  Expect<
    Equal<
      typeof pendingInput,
      Program.Pending<
        undefined,
        void,
        StoreConfig,
        never,
        Store | Command.HandlerOf<typeof Load>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof providedInput,
      Program.Element<
        undefined,
        never,
        never,
        StoreConfig | Store | Command.HandlerOf<typeof Load>
      >
    >
  >,
  Expect<
    Equal<
      typeof providedStoreOnly,
      Program.Pending<
        undefined,
        void,
        DecodeCount,
        never,
        Store | Command.HandlerOf<typeof Load>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof providedDispatch,
      Program.Element<
        undefined,
        never,
        never,
        DecodeCount | Store | Command.HandlerOf<typeof Load>
      >
    >
  >,
  Expect<
    Equal<
      typeof genericElement,
      Program.Pending<
        undefined,
        void,
        Store,
        never,
        Command.HandlerOf<typeof parts.Work>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof relocatedNested,
      Program.Program<
        undefined,
        void,
        Store,
        never,
        Block.Qualify<
          'node',
          Block.Qualify<'leaf', Command.HandlerOf<typeof Load>>
        >
      >
    >
  >,
]
