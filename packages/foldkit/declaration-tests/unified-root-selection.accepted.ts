import { Context, Data, Effect, Layer, Option, Schema } from 'effect'
import { Block, Message, Program } from 'foldkit'
import * as Server from 'foldkit/experimental/server'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { Url } from 'foldkit/url'

export const ResourceMessage = Message.defineMessageUnion({
  CompletedRead: {},
})
export class Store extends Context.Service<
  Store,
  Readonly<{ label: string }>
>()('UnionServiceProof/Store') {}
export const StoreLayer = Layer.succeed(Store, { label: 'ready' })

export const SessionNamespace = Block.makeNamespace('UnionServiceProof')
export const Session = SessionNamespace.makeResource<string>()('Session')
export const SessionKey = Symbol('UnionServiceProof')
export const SessionBlock = Block.make(SessionNamespace, {
  key: SessionKey,
  Model: Schema.Null,
  Message: ResourceMessage,
  effects: { managedResources: [Session], services: [Store] },
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const ReadSession = SessionBlock.makeCommand('ReadSession', {
  messages: [ResourceMessage.CompletedRead],
  handler: function* () {
    return () =>
      Session.get.pipe(
        Effect.map(() => ResourceMessage.CompletedRead()),
        Effect.catch(() => Effect.succeed(ResourceMessage.CompletedRead())),
      )
  },
})
export const managedResources = SessionBlock.makeManagedResources(entry => ({
  session: entry('ManageSession', Schema.Option(Schema.Null), {
    resource: Session,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => ResourceMessage.CompletedRead(),
    onReleased: () => ResourceMessage.CompletedRead(),
    onAcquireError: () => ResourceMessage.CompletedRead(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('ready'),
        release: () => Effect.void,
      }
    },
  }),
}))
export const Composition = SessionBlock.makeComposition()
export const implementation = {
  children: [],
  init: Composition.makeInit(() => ({
    model: null,
    commands: [ReadSession()],
  })),
  update: Composition.makeUpdate({
    CompletedRead: model => ({ model }),
  }),
  view: Composition.makeView(() => null),
  EffectsLayer: ReadSession.layer,
}
export const registeredLayer = SessionBlock.makeLayer(
  Effect.succeed({
    ...implementation,
    managedResources,
    EffectsLayer: Layer.merge(
      ReadSession.layer,
      managedResources.session.layer,
    ),
  }),
)
export const unregisteredLayer = SessionBlock.makeLayer(
  Effect.succeed(implementation),
)
export const renamedRegistrationLayer = SessionBlock.makeLayer(
  Effect.succeed({
    ...implementation,
    managedResources: { alternateSession: managedResources.session },
    EffectsLayer: Layer.merge(
      ReadSession.layer,
      managedResources.session.layer,
    ),
  }),
)
export const registered = { block: SessionBlock, layer: registeredLayer }
export const unregistered = { block: SessionBlock, layer: unregisteredLayer }
export const renamedRegistration = {
  block: SessionBlock,
  layer: renamedRegistrationLayer,
}
export const SessionReaderLayer = Layer.effectDiscard(
  Session.get.pipe(Effect.catch(() => Effect.succeed('idle'))),
)
export type SessionService = Layer.Services<typeof SessionReaderLayer>

export const startRegistered = Program.makeElement({
  ...registered,
  container: null,
}).provide(SessionReaderLayer).start

export const startEveryAlternativeRegistered = (
  selection: typeof registered | typeof renamedRegistration,
) =>
  Program.makeElement({ ...selection, container: null })
    .provide(Layer.empty)
    .provide(SessionReaderLayer).start

export const startUnionWithProvider = (
  selection: typeof registered | typeof unregistered,
  layer: Layer.Layer<SessionService>,
) =>
  Program.makeElement({ ...selection, container: null })
    .provide(Layer.empty)
    .provide(layer).start

export const startEveryAlternativeWithOrdinaryProvider = (
  selection: typeof registered | typeof renamedRegistration,
) =>
  Program.makeElement({ ...selection, container: null })
    .provide(Layer.effectDiscard(Store))
    .provide(StoreLayer).start

export const ReadStore = SessionBlock.makeCommand('ReadStore', {
  messages: [ResourceMessage.CompletedRead],
  handler: function* () {
    return () => Effect.map(Store, () => ResourceMessage.CompletedRead())
  },
})
export const storeImplementation = {
  children: [],
  init: Composition.makeInit(() => ({ model: null, commands: [ReadStore()] })),
  update: Composition.makeUpdate({ CompletedRead: model => ({ model }) }),
  view: Composition.makeView(() => null),
}
export const suppliedStoreLayer = SessionBlock.makeLayer(
  Effect.succeed({
    ...storeImplementation,
    EffectsLayer: Layer.merge(ReadStore.layer, StoreLayer),
  }),
)
export const unsuppliedStoreLayer = SessionBlock.makeLayer(
  Effect.succeed({
    ...storeImplementation,
    EffectsLayer: ReadStore.layer,
  }),
)
export const suppliedStore = { block: SessionBlock, layer: suppliedStoreLayer }
export const unsuppliedStore = {
  block: SessionBlock,
  layer: unsuppliedStoreLayer,
}
export const startStoreUnionWithProvider = (
  selection: typeof suppliedStore | typeof unsuppliedStore,
) =>
  Program.makeElement({ ...selection, container: null }).provide(StoreLayer)
    .start

export const makeResourceUnionProgram = (
  selection: typeof registered | typeof unregistered,
) => Program.makeElement({ ...selection, container: null })

export const makeRegisteredUnionProgram = (
  selection: typeof registered | typeof renamedRegistration,
) => Program.makeElement({ ...selection, container: null })

export const makeStoreUnionProgram = (
  selection: typeof suppliedStore | typeof unsuppliedStore,
) => Program.makeElement({ ...selection, container: null })

const ChildKey = Symbol('KeyedProbeChild')
export const DeclaredStoreChildBlock = Block.make('KeyedProbeChild', {
  key: ChildKey,
  Model: Schema.Struct({}),
  Message: defineMessageUnion({ CompletedRead: {} }),
  InitArgs: Schema.Tuple([]),
  effects: { services: [Store] },
})
const Read = DeclaredStoreChildBlock.makeCommand('Read', {
  messages: [DeclaredStoreChildBlock.Message.CompletedRead],
  handler: function* () {
    const store = yield* Store

    return () =>
      Effect.as(
        Effect.succeed(store.label),
        DeclaredStoreChildBlock.Message.CompletedRead(),
      )
  },
})
const ChildComposition = DeclaredStoreChildBlock.makeComposition()
const childLayer = DeclaredStoreChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: ChildComposition.makeInit(() => ({ model: {} })),
    update: ChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: Read.layer.pipe(Layer.provide(StoreLayer)),
  }),
)
const ParentKey = Symbol('KeyedProbeParent')
export const ParentBlock = Block.make('KeyedProbeParent', {
  key: ParentKey,
  Model: Schema.Struct({
    children: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        model: DeclaredStoreChildBlock.Model,
      }),
    ),
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  effects: { services: [Store] },
  view: { kind: 'Element' },
})
export const ChildrenBinding = ParentBlock.makeKeyedArrayBinding(
  DeclaredStoreChildBlock,
  {
    field: 'children',
    key: 'id',
    childField: 'model',
  },
)
export const readFirstChild = Story.messageIn(
  ChildrenBinding,
  'first',
  DeclaredStoreChildBlock.Message.CompletedRead(),
)
const ParentComposition = ParentBlock.makeComposition({
  bindings: [ChildrenBinding],
})
export const parentLayer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const child = yield* ChildrenBinding

    return {
      children: [child],
      init: ParentComposition.makeInit(() => ({ model: { children: [] } })),
      update: ParentComposition.makeUpdate({}),
      view: ParentComposition.makeView(() => null),
    }
  }),
).pipe(Layer.provide(childLayer))
const ClosedChildKey = Symbol('ClosedChild')
const ClosedChildBlock = Block.make('ClosedChild', {
  key: ClosedChildKey,
  Model: Schema.Struct({}),
  Message: defineMessageUnion({ CompletedRead: {} }),
  InitArgs: Schema.Tuple([]),
})
const ReadClosed = ClosedChildBlock.makeCommand('Read', {
  messages: [ClosedChildBlock.Message.CompletedRead],
  handler: function* () {
    const store = yield* Store

    return () =>
      Effect.as(
        Effect.succeed(store.label),
        ClosedChildBlock.Message.CompletedRead(),
      )
  },
})
const ClosedChildComposition = ClosedChildBlock.makeComposition()
const closedChildLayer = ClosedChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: ClosedChildComposition.makeInit(() => ({ model: {} })),
    update: ClosedChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    EffectsLayer: ReadClosed.layer.pipe(Layer.provide(StoreLayer)),
  }),
)
const ClosedParentKey = Symbol('ClosedParent')
export const ClosedParentBlock = Block.make('ClosedParent', {
  key: ClosedParentKey,
  Model: Schema.Struct({
    children: Schema.Array(
      Schema.Struct({ id: Schema.String, model: ClosedChildBlock.Model }),
    ),
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ClosedChildrenBinding = ClosedParentBlock.makeKeyedArrayBinding(
  ClosedChildBlock,
  {
    field: 'children',
    key: 'id',
    childField: 'model',
  },
)
const ClosedParentComposition = ClosedParentBlock.makeComposition({
  bindings: [ClosedChildrenBinding],
})
export const closedLayer = ClosedParentBlock.makeLayer(
  Effect.gen(function* () {
    const child = yield* ClosedChildrenBinding

    return {
      children: [child],
      init: ClosedParentComposition.makeInit(() => ({
        model: { children: [] },
      })),
      update: ClosedParentComposition.makeUpdate({}),
      view: ClosedParentComposition.makeView(() => null),
    }
  }),
).pipe(Layer.provide(closedChildLayer))

export const declaredStoreParent = { block: ParentBlock, layer: parentLayer }
export const closedStoreParent = {
  block: ClosedParentBlock,
  layer: closedLayer,
}
export const startDeclaredWithStore = Program.makeElement({
  ...declaredStoreParent,
  container: null,
}).provide(StoreLayer).start
export const startClosedParent = Program.makeElement({
  ...closedStoreParent,
  container: null,
}).start

export const PageKey = Symbol('UnionServicePage')
export const PageBlock = Block.make('UnionServicePage', {
  key: PageKey,
  Model: Schema.Null,
  Message: ResourceMessage,
  InitArgs: Schema.Tuple([]),
  effects: { managedResources: [Session] },
  view: { kind: 'Document' },
})
const PageComposition = PageBlock.makeComposition()
const pageResources = PageBlock.makeManagedResources(entry => ({
  session: entry('ManagePageSession', Schema.Option(Schema.Null), {
    resource: Session,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => ResourceMessage.CompletedRead(),
    onReleased: () => ResourceMessage.CompletedRead(),
    onAcquireError: () => ResourceMessage.CompletedRead(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('ready'),
        release: () => Effect.void,
      }
    },
  }),
}))
const pageImplementation = {
  children: [],
  init: PageComposition.makeInit(() => ({ model: null })),
  update: PageComposition.makeUpdate({ CompletedRead: model => ({ model }) }),
  view: PageComposition.makeView(() => ({ title: 'Session', body: null })),
}
export const pageRegisteredLayer = PageBlock.makeLayer(
  Effect.succeed({
    ...pageImplementation,
    managedResources: pageResources,
    EffectsLayer: pageResources.layer,
  }),
)
export const pageUnregisteredLayer = PageBlock.makeLayer(
  Effect.succeed(pageImplementation),
)
export const pageRegistered = { block: PageBlock, layer: pageRegisteredLayer }
export const pageUnregistered = {
  block: PageBlock,
  layer: pageUnregisteredLayer,
}
export const startRegisteredPage = Program.make({
  ...pageRegistered,
  container: null,
}).provide(SessionReaderLayer).start
export const makePageResourceUnionProgram = (
  selection: typeof pageRegistered | typeof pageUnregistered,
) => Program.make({ ...selection, container: null })

export const OtherKey = Symbol('OtherServiceRoot')
export const OtherBlock = Block.make('OtherServiceRoot', {
  key: OtherKey,
  Model: Schema.Null,
  Message: ResourceMessage,
  InitArgs: Schema.Tuple([]),
  effects: { managedResources: [Session] },
  view: { kind: 'Element' },
})
const OtherComposition = OtherBlock.makeComposition()
const otherResources = OtherBlock.makeManagedResources(entry => ({
  session: entry('ManageOtherSession', Schema.Option(Schema.Null), {
    resource: Session,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => ResourceMessage.CompletedRead(),
    onReleased: () => ResourceMessage.CompletedRead(),
    onAcquireError: () => ResourceMessage.CompletedRead(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('ready'),
        release: () => Effect.void,
      }
    },
  }),
}))
const otherImplementation = {
  children: [],
  init: OtherComposition.makeInit(() => ({ model: null })),
  update: OtherComposition.makeUpdate({ CompletedRead: model => ({ model }) }),
  view: OtherComposition.makeView(() => null),
}
export const otherRegisteredLayer = OtherBlock.makeLayer(
  Effect.succeed({
    ...otherImplementation,
    managedResources: otherResources,
    EffectsLayer: otherResources.layer,
  }),
)
export const otherUnregisteredLayer = OtherBlock.makeLayer(
  Effect.succeed(otherImplementation),
)
export const otherRegistered = {
  block: OtherBlock,
  layer: otherRegisteredLayer,
}
export const otherUnregistered = {
  block: OtherBlock,
  layer: otherUnregisteredLayer,
}
export const startDifferentRegisteredKeys = (
  selection: typeof registered | typeof otherRegistered,
) =>
  Program.makeElement({ ...selection, container: null }).provide(
    SessionReaderLayer,
  ).start
export const makeDifferentKeysProgram = (
  selection: typeof registered | typeof otherUnregistered,
) => Program.makeElement({ ...selection, container: null })
export const makeExplicitLayerUnionProgram = (
  layer: typeof registeredLayer | typeof unregisteredLayer,
) => Program.makeElement({ block: SessionBlock, layer, container: null })

export class Setup extends Context.Service<Setup, boolean>()(
  'RootSelection/Setup',
) {}
export class SetupFailure extends Data.TaggedError('SetupFailure')<{}> {}
export const SetupKey = Symbol('SetupRoot')
export const SetupBlock = Block.make('SetupRoot', {
  key: SetupKey,
  Model: Schema.Struct({ value: Schema.String }),
  Message: defineMessageUnion({ UpdatedValue: { value: Schema.String } }),
  InitArgs: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
})
const SetupComposition = SetupBlock.makeComposition()
const setupImplementation = {
  children: [],
  init: SetupComposition.makeInit(() => ({ model: { value: '' } })),
  update: SetupComposition.makeUpdate.withContext(prefix => ({
    UpdatedValue: (model, { value }) => ({
      model: modifyFields(model, { value: () => prefix + value }),
    }),
  })),
  view: SetupComposition.makeView((model, h) => h.div([], [model.value])),
}
export const simpleSetupLayer = SetupBlock.makeLayer(
  Effect.succeed(setupImplementation),
)
export const requestedSetupLayer = SetupBlock.makeLayer(
  Effect.gen(function* () {
    const isReady = yield* Setup

    if (!isReady) {
      return yield* Effect.fail(new SetupFailure())
    }

    return setupImplementation
  }),
)
export const simpleSetup = { block: SetupBlock, layer: simpleSetupLayer }
export const requestedSetup = { block: SetupBlock, layer: requestedSetupLayer }
export const withSetupService = {
  block: SetupBlock,
  layer: Layer.merge(simpleSetupLayer, Layer.succeed(Setup, true)),
}
export const explicitUnionCallbackService = (
  selection: typeof simpleSetup | typeof withSetupService,
) =>
  Story.withBlock<
    typeof SetupBlock,
    typeof simpleSetupLayer | typeof withSetupService.layer,
    Effect.Effect<void, never, Setup>
  >(selection, () => Effect.asVoid(Setup))
export const suppliedCallbackService = () =>
  Story.withBlock(withSetupService, () => Effect.asVoid(Setup))
export const runSuppliedCallback = () =>
  Effect.runPromise(suppliedCallbackService())
export const inspectSetup = (
  selection: typeof simpleSetup | typeof requestedSetup,
) => Story.withBlock(selection, block => block.init().model)
export const storySetup = (
  selection: typeof simpleSetup | typeof requestedSetup,
) =>
  Story.story(
    { ...selection, updateContext: ['ui:'] },
    Story.init(),
    Story.message(SetupBlock.Message.UpdatedValue({ value: 'ready' })),
  )
export const sceneSetup = (
  selection: typeof simpleSetup | typeof requestedSetup,
) => Scene.scene({ ...selection, updateContext: ['ui:'] }, Scene.init())

export const SetupPageKey = Symbol('SetupPageRoot')
export const SetupPageBlock = Block.make('SetupPageRoot', {
  key: SetupPageKey,
  isMessageFree: true,
  Model: Schema.Null,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const SetupPageComposition = SetupPageBlock.makeComposition()
const setupPageImplementation = {
  children: [],
  init: SetupPageComposition.makeInit(() => ({ model: null })),
  update: SetupPageComposition.makeUpdate({}),
  view: SetupPageComposition.makeView(() => ({ title: 'Setup', body: null })),
}
export const simpleSetupPageLayer = SetupPageBlock.makeLayer(
  Effect.succeed(setupPageImplementation),
)
export const requestedSetupPageLayer = SetupPageBlock.makeLayer(
  Effect.gen(function* () {
    const isReady = yield* Setup

    if (!isReady) {
      return yield* Effect.fail(new SetupFailure())
    }

    return setupPageImplementation
  }),
)
export const simpleSetupPage = {
  block: SetupPageBlock,
  layer: simpleSetupPageLayer,
}
export const requestedSetupPage = {
  block: SetupPageBlock,
  layer: requestedSetupPageLayer,
}
export const renderSetup = (
  selection: typeof simpleSetupPage | typeof requestedSetupPage,
) => Server.renderToString(selection, {})

export const RoutedPageKey = Symbol('RoutedSelectionPage')
export const RoutedPageBlock = Block.make('RoutedSelectionPage', {
  key: RoutedPageKey,
  Model: Schema.Null,
  Message: defineMessageUnion({
    RequestedNavigation: { request: UrlRequest },
    ChangedUrl: { url: Url },
  }),
  InitArgs: Schema.Tuple([Url]),
  view: { kind: 'Document' },
})
const RoutedPageComposition = RoutedPageBlock.makeComposition()
export const routedPageLayer = RoutedPageBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: RoutedPageComposition.makeInit(_url => ({ model: null })),
    update: RoutedPageComposition.makeUpdate({
      RequestedNavigation: model => ({ model }),
      ChangedUrl: model => ({ model }),
    }),
    view: RoutedPageComposition.makeView(() => ({
      title: 'Routed',
      body: null,
    })),
  }),
)
export const routedProgram = Program.make({
  block: RoutedPageBlock,
  layer: routedPageLayer,
  container: null,
  routing: {
    onUrlRequest: request => {
      const exactRequest: UrlRequest = request
      // @ts-expect-error Routing callbacks keep exact UrlRequest fields.
      request.missing
      return RoutedPageBlock.Message.RequestedNavigation({
        request: exactRequest,
      })
    },
    onUrlChange: url => {
      const exactUrl: Url = url
      // @ts-expect-error Routing callbacks keep exact Url fields.
      url.missing
      return RoutedPageBlock.Message.ChangedUrl({ url: exactUrl })
    },
  },
})

export const makeConfigUnionProgram = (
  config: (typeof registered | typeof unregistered) &
    Readonly<{ container: HTMLElement | null }>,
) => Program.makeElement(config)

export const startDifferentRegisteredPages = (
  selection: typeof pageRegistered | typeof simpleSetupPage,
) => Program.make({ ...selection, container: null }).provide(Layer.empty).start

export const makeDifferentPageKeysProgram = (
  selection: typeof pageRegistered | typeof simpleSetupPage,
) => Program.make({ ...selection, container: null })

export const setupRegisteredLayer = Layer.unwrap(
  Effect.gen(function* () {
    const isReady = yield* Setup

    if (!isReady) {
      return yield* Effect.fail(new SetupFailure())
    }

    return registeredLayer
  }),
)
export const makeSameBlockLayerUnionProgram = (
  layer: typeof registeredLayer | typeof setupRegisteredLayer,
) => Program.makeElement({ block: SessionBlock, layer, container: null })
export const inspectSameBlockLayerUnion = (
  layer: typeof registeredLayer | typeof setupRegisteredLayer,
) =>
  Story.withBlock({ block: SessionBlock, layer }, block => block.init().model)
export const storySameBlockLayerUnion = (
  layer: typeof registeredLayer | typeof setupRegisteredLayer,
) => Story.story({ block: SessionBlock, layer }, Story.init())
export const sceneSameBlockLayerUnion = (
  layer: typeof registeredLayer | typeof setupRegisteredLayer,
) => Scene.scene({ block: SessionBlock, layer }, Scene.init())

export const mergedRootLayer = Layer.mergeAll(
  registeredLayer,
  otherRegisteredLayer,
  Layer.succeed(Setup, true),
)
export const mergedRootProgram = Program.makeElement({
  block: SessionBlock,
  layer: mergedRootLayer,
  container: null,
})
export const inspectMergedRoot = () =>
  Story.withBlock({ block: SessionBlock, layer: mergedRootLayer }, () =>
    Effect.asVoid(Setup),
  )
export const storyMergedRoot = () =>
  Story.story({ block: SessionBlock, layer: mergedRootLayer }, Story.init())
export const sceneMergedRoot = () =>
  Scene.scene({ block: SessionBlock, layer: mergedRootLayer }, Scene.init())

export const setupRegisteredPageLayer = Layer.unwrap(
  Effect.gen(function* () {
    const isReady = yield* Setup

    if (!isReady) {
      return yield* Effect.fail(new SetupFailure())
    }

    return pageRegisteredLayer
  }),
)
export const makeSamePageLayerUnionProgram = (
  layer: typeof pageRegisteredLayer | typeof setupRegisteredPageLayer,
) => Program.make({ block: PageBlock, layer, container: null })
export const renderSamePageLayerUnion = (
  layer: typeof pageRegisteredLayer | typeof setupRegisteredPageLayer,
) => Server.renderToString({ block: PageBlock, layer }, {})
export const mergedPageLayer = Layer.mergeAll(
  pageRegisteredLayer,
  simpleSetupPageLayer,
  Layer.succeed(Setup, true),
)
export const mergedPageProgram = Program.make({
  block: PageBlock,
  layer: mergedPageLayer,
  container: null,
})
export const renderMergedPage = () =>
  Server.renderToString({ block: PageBlock, layer: mergedPageLayer }, {})
