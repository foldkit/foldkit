import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
  Stream,
  Tuple,
} from 'effect'
import * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import * as Server from 'foldkit/experimental/server'
import * as MessageModule from 'foldkit/message'
import * as Program from 'foldkit/program'
import type * as Update from 'foldkit/update'
import type * as Url from 'foldkit/url'

export type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
export type Expect<Value extends true> = Value

export class DecodeCount extends Context.Service<
  DecodeCount,
  Readonly<{ parse: (value: string) => number }>
>()('RootBoundary/DecodeCount') {}
export class EncodeCount extends Context.Service<
  EncodeCount,
  Readonly<{ format: (value: number) => string }>
>()('RootBoundary/EncodeCount') {}
export const Count = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.transformEffect({
      decode: value => Effect.map(DecodeCount, service => service.parse(value)),
      encode: value =>
        Effect.map(EncodeCount, service => service.format(value)),
    }),
  ),
  Schema.brand('RootBoundaryCount'),
)
export const Model = Schema.Struct({ count: Count })
export const Message = MessageModule.defineMessageUnion({
  RequestedLoad: { key: Schema.Literals(['Primary', 'Secondary']) },
  CompletedLoad: { count: Count },
})
export type Key = typeof Message.RequestedLoad.Type.key
export type Source = 'toolbar' | 'keyboard'

export class Store extends Context.Service<
  Store,
  Readonly<{ load: (key: Key) => Effect.Effect<number> }>
>()('RootBoundary/Store') {}
export class StoreConfig extends Context.Service<
  StoreConfig,
  Readonly<{ prefix: string }>
>()('RootBoundary/StoreConfig') {}
export class StoreUnavailable {
  readonly _tag = 'RootBoundaryStoreUnavailable'
}
export const StoreLayer = Layer.effect(
  Store,
  Effect.gen(function* () {
    const config = yield* StoreConfig
    if (config.prefix.length === 0) {
      return yield* Effect.fail(new StoreUnavailable())
    }
    return Store.of({
      load: key => Effect.succeed(config.prefix.length + key.length),
    })
  }),
)
export const StoreConfigLayer = Layer.succeed(StoreConfig, { prefix: 'ready' })

export const RootBoundaryDefinition = Block.makeDefinition('RootBoundary', {
  Model,
  Message,
})
export const Load = RootBoundaryDefinition.makeCommand('Load', {
  args: { key: Message.RequestedLoad.fields.key },
  messages: [Message.CompletedLoad],
  handler: function* () {
    const store = yield* Store
    return ({ key }) =>
      Effect.map(store.load(key), count =>
        Message.CompletedLoad({ count: Count.make(count) }),
      )
  },
})
export const RootBoundaryComposition = RootBoundaryDefinition.makeComposition()
export const implementation = {
  init: RootBoundaryComposition.makeInit(() => ({
    model: Model.make({ count: Count.make(0) }),
  })),
  update: RootBoundaryComposition.makeUpdate(
    (model, message, _source?: Source) =>
      Message.match(message, {
        RequestedLoad: ({ key }) => ({ model, commands: [Load({ key })] }),
        CompletedLoad: ({ count }) => ({ model: Model.make({ count }) }),
      }),
  ),
  operations: {
    load: (key: Key, source: Source = 'toolbar') =>
      Tuple.make(Message.RequestedLoad({ key }), source),
  },
  view: RootBoundaryComposition.makeView((model, h) =>
    h.main([], [globalThis.String(model.count)]),
  ),
  EffectsLayer: Load.layer,
}

export interface ApplicationRootChannels extends Block.RootChannelsFor<
  typeof RootBoundaryComposition,
  typeof implementation
> {}
type ApplicationMessageSchema = typeof RootBoundaryComposition.Message
export interface ApplicationMessage extends ApplicationMessageSchema {}
type ApplicationImplementationContract = typeof implementation
export interface ApplicationImplementation extends ApplicationImplementationContract {}
export type ApplicationRootContract = Block.Root<
  typeof RootBoundaryDefinition.owner,
  typeof Model,
  ApplicationMessage,
  ApplicationImplementation,
  ApplicationRootChannels
>
export type ApplicationRoot = ApplicationRootContract
export const ApplicationRoot: ApplicationRoot =
  RootBoundaryComposition.assembleRoot(implementation)

// A separate consumer-authored projection must preserve the same exact proof;
// the recommended application annotation above needs no manual member list.
export interface ProjectedRoot extends Block.RootEvidence<ApplicationRootChannels> {
  readonly owner: typeof RootBoundaryDefinition.owner
  readonly Model: typeof Model
  readonly Message: ApplicationMessage
  readonly init: ApplicationRootContract['init']
  readonly update: ApplicationRootContract['update']
  readonly operations: ApplicationRootContract['operations']
}
const projectedRoot: ProjectedRoot = ApplicationRoot
const preciseRoot: ApplicationRootContract = projectedRoot
export const PendingElement = Program.makeElement({
  block: preciseRoot,
  container: null,
})

export const suppliedImplementation = {
  ...implementation,
  EffectsLayer: Layer.provideMerge(Load.layer, StoreLayer),
}
export interface SuppliedRootChannels extends Block.RootChannelsFor<
  typeof RootBoundaryComposition,
  typeof suppliedImplementation
> {}
type SuppliedImplementationContract = typeof suppliedImplementation
export interface SuppliedImplementation extends SuppliedImplementationContract {}
export type SuppliedRoot = Block.Root<
  typeof RootBoundaryDefinition.owner,
  typeof Model,
  ApplicationMessage,
  SuppliedImplementation,
  SuppliedRootChannels
>
export const SuppliedRoot: SuppliedRoot = RootBoundaryComposition.assembleRoot(
  suppliedImplementation,
)
export const PendingLayerInput = Program.makeElement({
  block: SuppliedRoot,
  container: null,
})
export const RunnableElement = PendingLayerInput.provide(StoreConfigLayer)
export const startRunnableElement = RunnableElement.start

export const PendingDispatchElement = Program.makeElement({
  block: ApplicationRoot,
  container: null,
  devTools: { dispatch: true },
})
export const MaybeSuppliedRoot =
  globalThis.Math.random() > 0.5 ? ApplicationRoot : SuppliedRoot
export const PendingUnionDispatch = Program.makeElement({
  block: MaybeSuppliedRoot,
  container: null,
  devTools: { dispatch: true },
})

export const documentView = RootBoundaryComposition.makeView(model => ({
  title: globalThis.String(model.count),
  body: null,
}))
export const DocumentRoot = RootBoundaryComposition.assembleRoot({
  ...implementation,
  view: documentView,
})
export const DocumentProgram = Program.make({
  block: DocumentRoot,
  container: null,
})
export const renderDocument = () =>
  Server.renderToString(DocumentRoot, {}, { isHydratable: false })
export const Flags = Schema.Struct({ name: Schema.String })
export const FlagsRoot = RootBoundaryComposition.assembleRoot({
  ...implementation,
  init: (flags: typeof Flags.Type) => ({
    model: Model.make({ count: Count.make(flags.name.length) }),
  }),
})
export const FlagsElement = Program.makeElement({
  block: FlagsRoot,
  container: null,
  Flags,
  flags: Effect.succeed(Flags.make({ name: 'ready' })),
})

export const QueryModel = Schema.Struct({ length: Schema.Number })
export const QueryMessage = MessageModule.defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
})
export const QueryComposition = Block.makeDefinition('RootBoundaryQuery', {
  Model: QueryModel,
  Message: QueryMessage,
}).makeComposition()
export const queryImplementation = {
  init: (_url: Url.Url) => ({
    model: QueryModel.make({ length: 0 }),
  }),
  update: QueryComposition.makeUpdate((_model, message) => ({
    model: QueryModel.make({ length: message.query.length }),
  })),
  view: QueryComposition.makeView(model => ({
    title: globalThis.String(model.length),
    body: null,
  })),
  EffectsLayer: Layer.empty,
}
type QueryMessageSchema = typeof QueryComposition.Message
export interface QueryMessageContract extends QueryMessageSchema {}
type QueryImplementationContract = typeof queryImplementation
export interface QueryImplementation extends QueryImplementationContract {}
export interface QueryRootChannels extends Block.RootChannelsFor<
  typeof QueryComposition,
  QueryImplementation
> {}
export type QueryRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  QueryMessageContract,
  QueryImplementation,
  QueryRootChannels
>
export const QueryRoot: QueryRoot =
  QueryComposition.assembleRoot(queryImplementation)
type ProducerResult<Producer> = Producer extends (
  ...args: infer _Args
) => infer Result
  ? Result
  : never
export type QueryInitResult = ProducerResult<QueryRoot['init']>
export type QueryUpdateResult = ProducerResult<QueryRoot['update']>
export interface ProjectedQueryRoot extends Block.RootEvidence<QueryRootChannels> {
  readonly owner: QueryRoot['owner']
  readonly Model: QueryRoot['Model']
  readonly Message: QueryRoot['Message']
  readonly init: QueryRoot['init']
  readonly update: QueryRoot['update']
  readonly operations: QueryRoot['operations']
}
const projectedQueryRoot: ProjectedQueryRoot = QueryRoot
const preciseQueryRoot: QueryRoot = projectedQueryRoot
export const QueryRouting = {
  onUrlRequest: () => QueryMessage.UpdatedQuery({ query: 'request' }),
  onUrlChange: () => QueryMessage.UpdatedQuery({ query: 'change' }),
}
export const QueryProgram = Program.make({
  block: QueryRoot,
  container: null,
  routing: QueryRouting,
})
export const ProjectedQueryProgram = Program.make({
  block: projectedQueryRoot,
  container: null,
  routing: QueryRouting,
})
export const startQueryProgram = QueryProgram.start
export const startProjectedQueryProgram = ProjectedQueryProgram.start

export const queryOperationsImplementation = {
  ...queryImplementation,
  operations: {
    setQuery: (query: string) =>
      Tuple.make(QueryMessage.UpdatedQuery({ query })),
  },
}
export type QueryOperationInput = ProducerResult<
  typeof queryOperationsImplementation.operations.setQuery
>
export interface QueryOperationsRootChannels extends Block.RootChannelsFor<
  typeof QueryComposition,
  typeof queryOperationsImplementation
> {}
export type QueryOperationsRoot = Block.Root<
  typeof QueryComposition.owner,
  typeof QueryModel,
  QueryMessageContract,
  typeof queryOperationsImplementation,
  QueryOperationsRootChannels
>
export const QueryOperationsRoot: QueryOperationsRoot =
  QueryComposition.assembleRoot(queryOperationsImplementation)
export type QueryOperationResult = ProducerResult<
  QueryOperationsRoot['operations']['setQuery']
>
export const QueryOperationsProgram = Program.make({
  block: QueryOperationsRoot,
  container: null,
  routing: QueryRouting,
})
export const startQueryOperationsProgram = QueryOperationsProgram.start

export type QueryRootAssertions = [
  Expect<Equal<typeof QueryProgram, Program.Program>>,
  Expect<Equal<typeof ProjectedQueryProgram, Program.Program>>,
  Expect<Equal<typeof QueryOperationsProgram, Program.Program>>,
  Expect<Equal<typeof QueryRoot.owner, typeof QueryComposition.owner>>,
  Expect<Equal<typeof QueryRoot.Model, typeof QueryModel>>,
  Expect<Equal<typeof QueryRoot.Model.Type, Readonly<{ length: number }>>>,
  Expect<Equal<typeof QueryRoot.Model.Encoded, Readonly<{ length: number }>>>,
  Expect<Equal<typeof QueryRoot.Message, QueryMessageContract>>,
  Expect<Equal<typeof QueryRoot.Message.Type, typeof QueryMessage.Type>>,
  Expect<Equal<typeof QueryRoot.Message.Encoded, typeof QueryMessage.Encoded>>,
  Expect<Equal<typeof QueryRoot.init, typeof queryImplementation.init>>,
  Expect<Equal<typeof QueryRoot.update, typeof queryImplementation.update>>,
  Expect<Equal<typeof preciseQueryRoot, QueryRoot>>,
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

export const MinimalComposition = Block.makeDefinition('RootBoundaryMinimal', {
  Model: Schema.Null,
  Message: Schema.Never,
}).makeComposition()
export const minimalImplementation = {
  init: () => ({ model: null }),
  update: MinimalComposition.makeUpdate(),
  view: MinimalComposition.makeView(() => null),
}
export const OmittedRecipeRoot = MinimalComposition.assembleRoot(
  minimalImplementation,
)
export const EmptyRecipeRoot = MinimalComposition.assembleRoot({
  ...minimalImplementation,
  EffectsLayer: Layer.empty,
})
export const RequiredRecipeRoot = MinimalComposition.assembleRoot({
  ...minimalImplementation,
  EffectsLayer: Layer.effectDiscard(StoreConfig),
})
export const OmittedRecipeElement = Program.makeElement({
  block: OmittedRecipeRoot,
  container: null,
})
export const EmptyRecipeElement = Program.makeElement({
  block: EmptyRecipeRoot,
  container: null,
})
export const RequiredRecipeElement = Program.makeElement({
  block: RequiredRecipeRoot,
  container: null,
})
export const startOmittedRecipe = OmittedRecipeElement.start
export const startEmptyRecipe = EmptyRecipeElement.start
export const startRequiredRecipe =
  RequiredRecipeElement.provide(StoreConfigLayer).start

export const LifecycleDefinition = Block.makeDefinition(
  'RootBoundaryLifecycle',
  {
    Model: Schema.Null,
    Message,
  },
)
export const LifecycleSession =
  LifecycleDefinition.makeResource<string>()('Session')
export const lifecycleSubscriptions = LifecycleDefinition.makeSubscriptions(
  entry => ({
    activity: entry('Activity', {
      messages: [Message.CompletedLoad],
      handler: function* () {
        yield* StoreConfig
        return () => Stream.empty
      },
    }),
  }),
)
export const lifecycleManagedResources =
  LifecycleDefinition.makeManagedResources(entry => ({
    session: entry('Session', Schema.Option(Schema.Null), {
      resource: LifecycleSession,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: () => Message.CompletedLoad({ count: Count.make(1) }),
      onReleased: () => Message.CompletedLoad({ count: Count.make(0) }),
      onAcquireError: () => Message.CompletedLoad({ count: Count.make(0) }),
      handler: function* () {
        const config = yield* StoreConfig
        return {
          acquire: () => Effect.succeed(config.prefix),
          release: () => Effect.void,
        }
      },
    }),
  }))
export const LifecycleComposition = LifecycleDefinition.makeComposition()
export const lifecycleImplementation = {
  init: () => ({ model: null }),
  update: LifecycleComposition.makeUpdate(model => ({ model })),
  view: LifecycleComposition.makeView(() => null),
  operations: {
    complete: () => Tuple.make(Message.CompletedLoad({ count: Count.make(0) })),
  },
  subscriptions: lifecycleSubscriptions,
  managedResources: lifecycleManagedResources,
  EffectsLayer: Layer.mergeAll(
    lifecycleSubscriptions.layer,
    lifecycleManagedResources.session.layer,
  ),
}
export const LifecycleRoot = LifecycleComposition.assembleRoot(
  lifecycleImplementation,
)
export const LifecycleElement = Program.makeElement({
  block: LifecycleRoot,
  container: null,
})
export const startLifecycle = LifecycleElement.provide(StoreConfigLayer).start

export const UnionProvisionMessage = MessageModule.defineMessageUnion({
  Done: {},
})
export const UnionProvisionDefinition = Block.makeDefinition(
  'RootBoundaryUnionProvision',
  {
    Model: Schema.Null,
    Message: UnionProvisionMessage,
  },
)
export const UnionProvisionSession =
  UnionProvisionDefinition.makeResource<string>()('Session')
export const UnionProvisionRead = UnionProvisionDefinition.makeCommand('Read', {
  messages: [UnionProvisionMessage.Done],
  handler: function* () {
    return () =>
      UnionProvisionSession.get.pipe(
        Effect.map(() => UnionProvisionMessage.Done()),
        Effect.catch(() => Effect.succeed(UnionProvisionMessage.Done())),
      )
  },
})
export const unionProvisionResources =
  UnionProvisionDefinition.makeManagedResources(entry => ({
    session: entry('ManageSession', Schema.Option(Schema.Null), {
      resource: UnionProvisionSession,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: () => UnionProvisionMessage.Done(),
      onReleased: () => UnionProvisionMessage.Done(),
      onAcquireError: () => UnionProvisionMessage.Done(),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('ready'),
          release: () => Effect.void,
        }
      },
    }),
  }))
export const UnionProvisionComposition =
  UnionProvisionDefinition.makeComposition()
export const unionProvisionImplementation = {
  init: UnionProvisionComposition.makeInit(() => ({
    model: null,
    commands: [UnionProvisionRead()],
  })),
  update: UnionProvisionComposition.makeUpdate(model => ({ model })),
  view: UnionProvisionComposition.makeView(() => null),
  EffectsLayer: UnionProvisionRead.layer,
}
export const unionRegisteredImplementation = {
  ...unionProvisionImplementation,
  managedResources: unionProvisionResources,
  EffectsLayer: Layer.merge(
    UnionProvisionRead.layer,
    unionProvisionResources.session.layer,
  ),
}
export const unionRenamedRegistrationImplementation = {
  ...unionRegisteredImplementation,
  managedResources: { alternateSession: unionProvisionResources.session },
}
export const UnionRegisteredBlock = UnionProvisionComposition.assembleBlock(
  unionRegisteredImplementation,
)
export const UnionUnregisteredBlock = UnionProvisionComposition.assembleBlock(
  unionProvisionImplementation,
)
export const UnionRenamedRegistrationBlock =
  UnionProvisionComposition.assembleBlock(
    unionRenamedRegistrationImplementation,
  )
export const UnionRegisteredRoot = UnionProvisionComposition.assembleRoot(
  unionRegisteredImplementation,
)
export const UnionUnregisteredRoot = UnionProvisionComposition.assembleRoot(
  unionProvisionImplementation,
)
export const UnionRenamedRegistrationRoot =
  UnionProvisionComposition.assembleRoot(unionRenamedRegistrationImplementation)
export const UnionSessionReaderLayer = Layer.effectDiscard(
  UnionProvisionSession.get.pipe(Effect.catch(() => Effect.succeed('idle'))),
)
export const startRegisteredResource = Program.makeElement({
  block: UnionRegisteredBlock,
  container: null,
}).provide(UnionSessionReaderLayer).start
export const startRegisteredRootResource = Program.makeElement({
  block: UnionRegisteredRoot,
  container: null,
}).provide(UnionSessionReaderLayer).start
export const startOrdinaryRegisteredUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationBlock,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(UnionSessionReaderLayer).start
export const startRootRegisteredUnion = (
  block: typeof UnionRegisteredRoot | typeof UnionRenamedRegistrationRoot,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(UnionSessionReaderLayer).start
export const startMixedRegisteredUnion = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationRoot,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(UnionSessionReaderLayer).start
export const startRegisteredUnionWithProvidedService = (
  block: typeof UnionRegisteredBlock | typeof UnionRenamedRegistrationRoot,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.effectDiscard(StoreConfig))
    .provide(StoreConfigLayer).start

export const startResourceUnionWithProvider = (
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

export const UnionKeyedModel = Schema.Struct({
  sessions: Schema.Array(
    Schema.Struct({ id: Schema.String, model: Schema.Null }),
  ),
})
export const UnionKeyedDefinition = Block.makeDefinition(
  'RootBoundaryUnionKeyed',
  { Model: UnionKeyedModel, Message: UnionProvisionMessage },
)
export const UnionKeyedRegisteredBinding = UnionKeyedDefinition.makeBinding(
  UnionRegisteredBlock,
  { field: 'sessions', key: 'id', childField: 'model' },
)
export const UnionKeyedUnregisteredBinding = UnionKeyedDefinition.makeBinding(
  UnionUnregisteredBlock,
  { field: 'sessions', key: 'id', childField: 'model' },
)
export const UnionKeyedOtherPlacementBinding = UnionKeyedDefinition.makeBinding(
  UnionRegisteredBlock,
  {
    field: 'sessions',
    key: 'id',
    childField: 'model',
    placement: 'otherSessions',
  },
)
export const UnionKeyedRegisteredComposition =
  UnionKeyedDefinition.makeComposition({
    bindings: [UnionKeyedRegisteredBinding],
  })
export const UnionKeyedUnregisteredComposition =
  UnionKeyedDefinition.makeComposition({
    bindings: [UnionKeyedUnregisteredBinding],
  })
export const UnionKeyedOtherPlacementComposition =
  UnionKeyedDefinition.makeComposition({
    bindings: [UnionKeyedOtherPlacementBinding],
  })
export const unionKeyedRegisteredImplementation = {
  init: () => ({ model: UnionKeyedModel.make({ sessions: [] }) }),
  update: UnionKeyedRegisteredComposition.makeUpdate(model => ({ model })),
  view: UnionKeyedRegisteredComposition.makeView(() => null),
}
export const UnionKeyedRegisteredBlock =
  UnionKeyedRegisteredComposition.assembleBlock(
    unionKeyedRegisteredImplementation,
  )
export const UnionKeyedRegisteredRoot =
  UnionKeyedRegisteredComposition.assembleRoot(
    unionKeyedRegisteredImplementation,
  )
export const UnionKeyedUnregisteredRoot =
  UnionKeyedUnregisteredComposition.assembleRoot({
    init: () => ({ model: UnionKeyedModel.make({ sessions: [] }) }),
    update: UnionKeyedUnregisteredComposition.makeUpdate(model => ({
      model,
    })),
    view: UnionKeyedUnregisteredComposition.makeView(() => null),
  })
export const UnionKeyedOtherPlacementBlock =
  UnionKeyedOtherPlacementComposition.assembleBlock({
    init: () => ({ model: UnionKeyedModel.make({ sessions: [] }) }),
    update: UnionKeyedOtherPlacementComposition.makeUpdate(model => ({
      model,
    })),
    view: UnionKeyedOtherPlacementComposition.makeView(() => null),
  })
export type UnionKeyedSession = Block.Qualify<
  typeof UnionKeyedRegisteredBinding.placement,
  Layer.Services<typeof UnionSessionReaderLayer>
>
export const startKeyedRegisteredUnion = (
  block: typeof UnionKeyedRegisteredBlock | typeof UnionKeyedRegisteredRoot,
  layer: Layer.Layer<never, never, UnionKeyedSession>,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(layer).start

// The owner stays generic during authoring; root completion happens only after
// the returned graph and implementation have been concretized by the caller.
export const makeGenericRootParts = <const Id extends string>(id: Id) => {
  const namespace = Block.makeNamespace(id)
  const Work = namespace.makeCommand('Work', {
    messages: [Message.CompletedLoad],
    handler: function* () {
      const store = yield* Store
      return () =>
        Effect.map(store.load('Primary'), count =>
          Message.CompletedLoad({ count: Count.make(count) }),
        )
    },
  })
  const composition = namespace
    .makeDefinition({ Model, Message })
    .makeComposition()
  const implementation = {
    init: composition.makeInit(() => ({
      model: Model.make({ count: Count.make(0) }),
    })),
    update: composition.makeUpdate((model, message) =>
      Message.match(message, {
        RequestedLoad: () => ({ model, commands: [Work()] }),
        CompletedLoad: ({ count }) => ({ model: Model.make({ count }) }),
      }),
    ),
    view: composition.makeView((model, h) =>
      h.main([], [globalThis.String(model.count)]),
    ),
    EffectsLayer: Work.layer,
  }
  return { composition, implementation, Work }
}
export const GenericParts = makeGenericRootParts('RootBoundaryGeneric')
export const GenericRoot = GenericParts.composition.assembleRoot(
  GenericParts.implementation,
)
export const GenericElement = Program.makeElement({
  block: GenericRoot,
  container: null,
})

export const LeafBlock = RootBoundaryComposition.assembleBlock(implementation)
type OrdinaryLoadParameters = Parameters<typeof LeafBlock.operations.load>
type OrdinaryUpdateParameters = Parameters<typeof LeafBlock.update>
export const NodeModel = Schema.Struct({ leaf: Model })
export const NodeMessage = MessageModule.defineMessageUnion({
  RequestedLoad: { key: Message.RequestedLoad.fields.key },
})
export const RootBoundaryNodeDefinition = Block.makeDefinition(
  'RootBoundaryNode',
  { Model: NodeModel, Message: NodeMessage },
)
export const LeafBinding = RootBoundaryNodeDefinition.makeBinding(LeafBlock, {
  field: 'leaf',
  init: false,
  delivery: { toUpdateContext: () => [] },
})
export const NodeComposition = RootBoundaryNodeDefinition.makeComposition({
  bindings: [LeafBinding],
})
export const nodeImplementation = {
  init: NodeComposition.makeInit(() => ({
    model: NodeModel.make({ leaf: Model.make({ count: Count.make(0) }) }),
  })),
  update: NodeComposition.makeUpdate((model, message) =>
    NodeMessage.match(message, {
      RequestedLoad: ({ key }) => LeafBinding.load(key)(model),
    }),
  ),
  operations: {
    load: (key: Key) => Tuple.make(NodeMessage.RequestedLoad({ key })),
  },
}
export const NodeBlock = NodeComposition.assembleBlock(nodeImplementation)
export const NestedModel = Schema.Struct({ node: NodeModel })
export const RootBoundaryNestedDefinition = Block.makeDefinition(
  'RootBoundaryNested',
  { Model: NestedModel, Message: NodeMessage },
)
export const NodeBinding = RootBoundaryNestedDefinition.makeBinding(NodeBlock, {
  field: 'node',
  init: false,
})
export const NestedComposition = RootBoundaryNestedDefinition.makeComposition({
  bindings: [NodeBinding],
})
export const nestedImplementation = {
  init: NestedComposition.makeInit(() => ({
    model: NestedModel.make({
      node: NodeModel.make({ leaf: Model.make({ count: Count.make(0) }) }),
    }),
  })),
  update: NestedComposition.makeUpdate((model, message) =>
    NodeMessage.match(message, {
      RequestedLoad: ({ key }) => NodeBinding.load(key)(model),
    }),
  ),
  view: NestedComposition.makeView(model => ({
    title: globalThis.String(model.node.leaf.count),
    body: null,
  })),
}
export const NestedRoot = NestedComposition.assembleRoot(nestedImplementation)
export const NestedProgram = Program.make({
  block: NestedRoot,
  container: null,
})

export type RootBoundaryAssertions = [
  Expect<Equal<typeof OmittedRecipeElement, Program.Element>>,
  Expect<Equal<typeof EmptyRecipeElement, Program.Element>>,
  Expect<
    Equal<
      typeof RequiredRecipeElement,
      Program.Pending<undefined, void, StoreConfig, never, never, 'Element'>
    >
  >,
  Expect<Equal<typeof ApplicationRoot.Model.Type, typeof Model.Type>>,
  Expect<
    Equal<typeof ApplicationRoot.Model.Encoded, Readonly<{ count: string }>>
  >,
  Expect<Equal<typeof ApplicationRoot.Model.DecodingServices, DecodeCount>>,
  Expect<Equal<typeof ApplicationRoot.Model.EncodingServices, EncodeCount>>,
  Expect<Equal<typeof ApplicationRoot.Message.Type, typeof Message.Type>>,
  Expect<Equal<typeof ApplicationRoot.Message.Encoded, typeof Message.Encoded>>,
  Expect<Equal<typeof ApplicationRoot.Message.DecodingServices, DecodeCount>>,
  Expect<Equal<typeof ApplicationRoot.Message.EncodingServices, EncodeCount>>,
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
    Equal<
      Parameters<typeof ApplicationRoot.operations.load>,
      OrdinaryLoadParameters
    >
  >,
  Expect<
    Equal<Parameters<typeof ApplicationRoot.update>, OrdinaryUpdateParameters>
  >,
  Expect<
    Equal<
      Update.RequirementsOf<typeof ApplicationRoot.operations.load>,
      Command.HandlerOf<typeof Load>
    >
  >,
  Expect<
    Equal<
      ApplicationRootChannels['operationRequirements'],
      Command.HandlerOf<typeof Load>
    >
  >,
  Expect<Equal<ApplicationRootChannels['requirements'], Store>>,
  Expect<Equal<SuppliedRootChannels['requirements'], StoreConfig>>,
  Expect<
    Equal<Layer.Error<SuppliedRootChannels['EffectsLayer']>, StoreUnavailable>
  >,
  Expect<
    Equal<
      typeof PendingElement,
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
      typeof PendingLayerInput,
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
      typeof RunnableElement,
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
      typeof PendingDispatchElement,
      Program.Pending<
        undefined,
        void,
        Store | DecodeCount,
        never,
        Command.HandlerOf<typeof Load>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof PendingUnionDispatch,
      Program.Pending<
        undefined,
        void,
        Store | StoreConfig | DecodeCount,
        never,
        Store | Command.HandlerOf<typeof Load>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof GenericElement,
      Program.Pending<
        undefined,
        void,
        Store,
        never,
        Command.HandlerOf<typeof GenericParts.Work>,
        'Element'
      >
    >
  >,
  Expect<
    Equal<
      typeof NestedProgram,
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
