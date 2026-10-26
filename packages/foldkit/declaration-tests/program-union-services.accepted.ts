import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Block, Message, Program } from 'foldkit'

export const ResourceMessage = Message.defineMessageUnion({
  CompletedRead: {},
})
export const Definition = Block.makeDefinition('UnionServiceProof', {
  Model: Schema.Null,
  Message: ResourceMessage,
})
export const Session = Definition.makeResource<string>()('Session')
export const ReadSession = Definition.makeCommand('ReadSession', {
  messages: [ResourceMessage.CompletedRead],
  handler: function* () {
    return () =>
      Session.get.pipe(
        Effect.map(() => ResourceMessage.CompletedRead()),
        Effect.catch(() => Effect.succeed(ResourceMessage.CompletedRead())),
      )
  },
})
export const managedResources = Definition.makeManagedResources(entry => ({
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
export const Composition = Definition.makeComposition()
export const implementation = {
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
const prepareRegisteredBlock = () =>
  Composition.prepareBlock({
    ...implementation,
    managedResources,
    EffectsLayer: Layer.merge(
      ReadSession.layer,
      managedResources.session.layer,
    ),
  })
export const RegisteredBlock: CompletedAssembly<typeof prepareRegisteredBlock> =
  Block.assemble(prepareRegisteredBlock)
const prepareUnregisteredBlock = () => Composition.prepareBlock(implementation)
export const UnregisteredBlock: CompletedAssembly<
  typeof prepareUnregisteredBlock
> = Block.assemble(prepareUnregisteredBlock)
const prepareRenamedRegistrationBlock = () =>
  Composition.prepareBlock({
    ...implementation,
    managedResources: { alternateSession: managedResources.session },
    EffectsLayer: Layer.merge(
      ReadSession.layer,
      managedResources.session.layer,
    ),
  })
export const RenamedRegistrationBlock: Block.FromAssemblyWithView<
  typeof Schema.Null,
  typeof prepareRenamedRegistrationBlock
> = Block.assemble(prepareRenamedRegistrationBlock)
export const SessionReaderLayer = Layer.effectDiscard(
  Session.get.pipe(Effect.catch(() => Effect.succeed('idle'))),
)
export type SessionService = Layer.Services<typeof SessionReaderLayer>

export class Store extends Context.Service<
  Store,
  Readonly<{ label: string }>
>()('UnionServiceProof/Store') {}
export const StoreLayer = Layer.succeed(Store, { label: 'ready' })

export const startRegistered = Program.makeElement({
  block: RegisteredBlock,
  container: null,
}).provide(SessionReaderLayer).start

export const startEveryAlternativeRegistered = (
  block: typeof RegisteredBlock | typeof RenamedRegistrationBlock,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(SessionReaderLayer).start

export const startUnionWithProvider = (
  block: typeof RegisteredBlock | typeof UnregisteredBlock,
  layer: Layer.Layer<SessionService>,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.empty)
    .provide(layer).start

export const startEveryAlternativeWithOrdinaryProvider = (
  block: typeof RegisteredBlock | typeof RenamedRegistrationBlock,
) =>
  Program.makeElement({ block, container: null })
    .provide(Layer.effectDiscard(Store))
    .provide(StoreLayer).start

export const KeyedModel = Schema.Struct({
  sessions: Schema.Array(
    Schema.Struct({ id: Schema.String, model: Schema.Null }),
  ),
})
export const KeyedDefinition = Block.makeDefinition('UnionKeyedServiceProof', {
  Model: KeyedModel,
  Message: ResourceMessage,
})
export const RegisteredBinding = KeyedDefinition.makeBinding(RegisteredBlock, {
  field: 'sessions',
  key: 'id',
  childField: 'model',
})
export const UnregisteredBinding = KeyedDefinition.makeBinding(
  UnregisteredBlock,
  {
    field: 'sessions',
    key: 'id',
    childField: 'model',
  },
)
export const OtherPlacementBinding = KeyedDefinition.makeBinding(
  RegisteredBlock,
  {
    field: 'sessions',
    key: 'id',
    childField: 'model',
    placement: 'otherSessions',
  },
)
export const RenamedRegisteredBinding = KeyedDefinition.makeBinding(
  RenamedRegistrationBlock,
  {
    field: 'sessions',
    key: 'id',
    childField: 'model',
  },
)
export const RegisteredComposition = KeyedDefinition.makeComposition({
  bindings: [RegisteredBinding],
})
export const UnregisteredComposition = KeyedDefinition.makeComposition({
  bindings: [UnregisteredBinding],
})
export const OtherPlacementComposition = KeyedDefinition.makeComposition({
  bindings: [OtherPlacementBinding],
})
export const RenamedRegisteredComposition = KeyedDefinition.makeComposition({
  bindings: [RenamedRegisteredBinding],
})
const prepareKeyedRegisteredBlock = () =>
  RegisteredComposition.prepareBlock({
    init: () => ({ model: KeyedModel.make({ sessions: [] }) }),
    update: RegisteredComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    view: RegisteredComposition.makeView(() => null),
  })
export const KeyedRegisteredBlock: Block.FromAssemblyWithView<
  typeof KeyedModel,
  typeof prepareKeyedRegisteredBlock
> = Block.assemble(prepareKeyedRegisteredBlock)
const prepareKeyedUnregisteredBlock = () =>
  UnregisteredComposition.prepareBlock({
    init: () => ({ model: KeyedModel.make({ sessions: [] }) }),
    update: UnregisteredComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    view: UnregisteredComposition.makeView(() => null),
  })
export const KeyedUnregisteredBlock: Block.FromAssemblyWithView<
  typeof KeyedModel,
  typeof prepareKeyedUnregisteredBlock
> = Block.assemble(prepareKeyedUnregisteredBlock)
const prepareKeyedOtherPlacementBlock = () =>
  OtherPlacementComposition.prepareBlock({
    init: () => ({ model: KeyedModel.make({ sessions: [] }) }),
    update: OtherPlacementComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    view: OtherPlacementComposition.makeView(() => null),
  })
export const KeyedOtherPlacementBlock: Block.FromAssemblyWithView<
  typeof KeyedModel,
  typeof prepareKeyedOtherPlacementBlock
> = Block.assemble(prepareKeyedOtherPlacementBlock)
const prepareKeyedRenamedRegisteredBlock = () =>
  RenamedRegisteredComposition.prepareBlock({
    init: () => ({ model: KeyedModel.make({ sessions: [] }) }),
    update: RenamedRegisteredComposition.makeUpdate({
      CompletedRead: model => ({ model }),
    }),
    view: RenamedRegisteredComposition.makeView(() => null),
  })
export const KeyedRenamedRegisteredBlock: Block.FromAssemblyWithView<
  typeof KeyedModel,
  typeof prepareKeyedRenamedRegisteredBlock
> = Block.assemble(prepareKeyedRenamedRegisteredBlock)
export type KeyedSessionService = Block.Qualify<
  typeof RegisteredBinding.placement,
  SessionService
>
export const startKeyedWithProvider = (
  block: typeof KeyedRegisteredBlock | typeof KeyedUnregisteredBlock,
  layer: Layer.Layer<KeyedSessionService>,
) => Program.makeElement({ block, container: null }).provide(layer).start

export const startEveryKeyedAlternativeRegistered = (
  block: typeof KeyedRegisteredBlock | typeof KeyedRenamedRegisteredBlock,
  layer: Layer.Layer<never, never, KeyedSessionService>,
) => Program.makeElement({ block, container: null }).provide(layer).start

export const ReadStore = Definition.makeCommand('ReadStore', {
  messages: [ResourceMessage.CompletedRead],
  handler: function* () {
    return () => Effect.map(Store, () => ResourceMessage.CompletedRead())
  },
})
export const storeImplementation = {
  init: Composition.makeInit(() => ({ model: null, commands: [ReadStore()] })),
  update: Composition.makeUpdate({
    CompletedRead: model => ({ model }),
  }),
  view: Composition.makeView(() => null),
}
const prepareSuppliedStoreBlock = () =>
  Composition.prepareBlock({
    ...storeImplementation,
    EffectsLayer: Layer.merge(ReadStore.layer, StoreLayer),
  })
export const SuppliedStoreBlock: Block.FromAssemblyWithView<
  typeof Schema.Null,
  typeof prepareSuppliedStoreBlock
> = Block.assemble(prepareSuppliedStoreBlock)
const prepareUnsuppliedStoreBlock = () =>
  Composition.prepareBlock({
    ...storeImplementation,
    EffectsLayer: ReadStore.layer,
  })
export const UnsuppliedStoreBlock: Block.FromAssemblyWithView<
  typeof Schema.Null,
  typeof prepareUnsuppliedStoreBlock
> = Block.assemble(prepareUnsuppliedStoreBlock)
export const startStoreUnionWithProvider = (
  block: typeof SuppliedStoreBlock | typeof UnsuppliedStoreBlock,
) => Program.makeElement({ block, container: null }).provide(StoreLayer).start

export const makeResourceUnionProgram = (
  block: typeof RegisteredBlock | typeof UnregisteredBlock,
) => Program.makeElement({ block, container: null })

export const makeRegisteredUnionProgram = (
  block: typeof RegisteredBlock | typeof RenamedRegistrationBlock,
) => Program.makeElement({ block, container: null })

export const makeKeyedResourceUnionProgram = (
  block: typeof KeyedRegisteredBlock | typeof KeyedUnregisteredBlock,
) => Program.makeElement({ block, container: null })

export const makeDifferentPlacementProgram = (
  block: typeof KeyedRegisteredBlock | typeof KeyedOtherPlacementBlock,
  layer: Layer.Layer<never, never, KeyedSessionService>,
) => Program.makeElement({ block, container: null }).provide(layer)

export const makeStoreUnionProgram = (
  block: typeof SuppliedStoreBlock | typeof UnsuppliedStoreBlock,
) => Program.makeElement({ block, container: null })

export const AnnotatedRegisteredBlock: Block.FromAssemblyWithView<
  typeof Schema.Null,
  typeof prepareRegisteredBlock
> = Block.assemble(prepareRegisteredBlock)
export const AnnotatedUnregisteredBlock: Block.FromAssemblyWithView<
  typeof Schema.Null,
  typeof prepareUnregisteredBlock
> = Block.assemble(prepareUnregisteredBlock)

type CompletedAssembly<Producer extends () => Block.AssemblyDraft<object>> =
  ReturnType<Producer> extends Block.AssemblyDraft<infer Completed>
    ? Completed
    : never
