import { Effect, Layer, Option, Schema, Stream, Tuple } from 'effect'
import { Block, Message } from 'foldkit'

export const RoomId = Schema.String.pipe(
  Schema.brand('DeclarationOptionalWrappedKeyedRoomId'),
)
export const RoomModel = Schema.Struct({ count: Schema.Number })
export const RoomMessage = Message.defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  ObservedTick: { label: Schema.String },
  AcquiredSession: { value: Schema.String },
  ReleasedSession: {},
  FailedAcquireSession: {},
})
export const RoomContext = Schema.Struct({ roomId: RoomId })
const DeclarationOptionalWrappedKeyedRoomDefinition = Block.makeDefinition(
  'DeclarationOptionalWrappedKeyedRoom',
  {
    Model: RoomModel,
    Message: RoomMessage,
  },
)
const DeclarationOptionalWrappedKeyedRoomComposition =
  DeclarationOptionalWrappedKeyedRoomDefinition.makeComposition()
export const RoomSession =
  DeclarationOptionalWrappedKeyedRoomDefinition.makeResource<string>()(
    'RoomSession',
  )
export const roomSubscriptions =
  DeclarationOptionalWrappedKeyedRoomDefinition.makeSubscriptions(entry => ({
    ticks: entry('RoomTicks', {
      messages: [RoomMessage.ObservedTick],
      handler: function* () {
        return () => Stream.succeed(RoomMessage.ObservedTick({ label: 'tick' }))
      },
    }),
  }))
export const roomManagedResources =
  DeclarationOptionalWrappedKeyedRoomDefinition.makeManagedResources(entry => ({
    session: entry('RoomSession', Schema.Option(Schema.Null), {
      resource: RoomSession,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: value => RoomMessage.AcquiredSession({ value }),
      onReleased: RoomMessage.ReleasedSession,
      onAcquireError: () => RoomMessage.FailedAcquireSession(),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('session'),
          release: () => Effect.void,
        }
      },
    }),
  }))
const prepareRoomBlock = () =>
  DeclarationOptionalWrappedKeyedRoomComposition.prepareBlock({
    init: DeclarationOptionalWrappedKeyedRoomComposition.makeInit(
      (count: number) => ({
        model: RoomModel.make({ count }),
      }),
    ),
    update:
      DeclarationOptionalWrappedKeyedRoomComposition.makeUpdate.withContext(
        (context: typeof RoomContext.Type) => ({
          RequestedSetCount: (model, { count }) => ({
            model: RoomModel.make({ count: count + context.roomId.length }),
          }),
          ObservedTick: model => ({ model }),
          AcquiredSession: model => ({ model }),
          ReleasedSession: model => ({ model }),
          FailedAcquireSession: model => ({ model }),
        }),
      ),
    operations: {
      setCount: (count: number, context: typeof RoomContext.Type) =>
        Tuple.make(RoomMessage.RequestedSetCount({ count }), context),
    },
    subscriptions: roomSubscriptions,
    managedResources: roomManagedResources,
    EffectsLayer: Layer.mergeAll(
      roomSubscriptions.ticks.layer,
      roomManagedResources.session.layer,
    ),
  })
export const RoomBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RoomModel,
  typeof prepareRoomBlock
> = Block.assemble(prepareRoomBlock)
const DeclarationOptionalWrappedKeyedPlainRoomDefinition = Block.makeDefinition(
  'DeclarationOptionalWrappedKeyedPlainRoom',
  {
    Model: RoomModel,
    Message: Schema.Never,
  },
)
const DeclarationOptionalWrappedKeyedPlainRoomComposition =
  DeclarationOptionalWrappedKeyedPlainRoomDefinition.makeComposition()
const preparePlainRoomBlock = () =>
  DeclarationOptionalWrappedKeyedPlainRoomComposition.prepareBlock({
    init: DeclarationOptionalWrappedKeyedPlainRoomComposition.makeInit(() => ({
      model: RoomModel.make({ count: 0 }),
    })),
    update: DeclarationOptionalWrappedKeyedPlainRoomComposition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const PlainRoomBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RoomModel,
  typeof preparePlainRoomBlock
> = Block.assemble(preparePlainRoomBlock)

export const RoomInstance = Schema.Struct({
  roomId: RoomId,
  model: RoomModel,
  label: Schema.String,
})
export const LiteralRoomId = Schema.Literals(['Primary', 'Secondary'])
export const LiteralRoomInstance = Schema.Struct({
  roomId: LiteralRoomId,
  model: RoomModel,
})
export const ParentModel = Schema.Struct({
  maybeRoomInstance: Schema.Option(RoomInstance),
  maybeLiteralRoomInstance: Schema.Option(LiteralRoomInstance),
  isSubscriptionEnabled: Schema.Boolean,
})
export const ParentMessage = Message.defineMessageUnion({
  IgnoredRoomMessage: {},
})
export const DeclarationOptionalWrappedKeyedParentDefinition =
  Block.makeDefinition('DeclarationOptionalWrappedKeyedParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })

export const RoomBinding =
  DeclarationOptionalWrappedKeyedParentDefinition.makeOptionalKeyedFieldBinding(
    RoomBlock,
    {
      field: 'maybeRoomInstance',
      key: 'roomId',
      childField: 'model',
      delivery: {
        when: (model, roomId) =>
          Option.exists(
            model.maybeRoomInstance,
            room => room.roomId === roomId,
          ),
        toUpdateContext: (_model, roomId) => [{ roomId }],
      },
      subscriptions: {
        when: (model, roomId) =>
          model.isSubscriptionEnabled &&
          Option.exists(
            model.maybeRoomInstance,
            room => room.roomId === roomId,
          ),
      },
    },
  )
export const LiteralRoomBinding =
  DeclarationOptionalWrappedKeyedParentDefinition.makeOptionalKeyedFieldBinding(
    PlainRoomBlock,
    {
      field: 'maybeLiteralRoomInstance',
      key: 'roomId',
      childField: 'model',
      placement: 'literalRoom',
    },
  )
export const DeclarationOptionalWrappedKeyedParentComposition =
  DeclarationOptionalWrappedKeyedParentDefinition.makeComposition({
    bindings: [RoomBinding, LiteralRoomBinding],
  })

export const initRoom =
  DeclarationOptionalWrappedKeyedParentComposition.makeInit(
    (roomId: typeof RoomId.Type) =>
      RoomBinding.init({
        key: roomId,
        args: [1],
        toParentModel: model =>
          ParentModel.make({
            maybeRoomInstance: Option.some(
              RoomInstance.make({ roomId, model, label: 'Room' }),
            ),
            maybeLiteralRoomInstance: Option.none(),
            isSubscriptionEnabled: true,
          }),
      }),
  )

export const makePayloadParent = <A, I>(payloadSchema: Schema.Codec<A, I>) => {
  const PayloadRoomInstance = Schema.Struct({
    roomId: RoomId,
    model: RoomModel,
    payload: payloadSchema,
  })
  const Model = Schema.Struct({
    maybeRoomInstance: Schema.Option(PayloadRoomInstance),
  })
  const DeclarationOptionalWrappedKeyedPayloadParentDefinition =
    Block.makeDefinition('DeclarationOptionalWrappedKeyedPayloadParent', {
      Model,
      Message: ParentMessage,
    })
  const Binding =
    DeclarationOptionalWrappedKeyedPayloadParentDefinition.makeOptionalKeyedFieldBinding(
      RoomBlock,
      {
        field: 'maybeRoomInstance',
        key: 'roomId',
        childField: 'model',
        delivery: {
          toUpdateContext: (_model, roomId) => [{ roomId }],
        },
      },
    )

  return { Binding, Model }
}

export const payloadParent = makePayloadParent(
  Schema.Struct({ label: Schema.String }),
)

export const CanonicalChildModel = Schema.Struct({ count: Schema.Number })
export const CanonicalChildMessage = Message.defineMessageUnion({
  ObservedTick: {},
  AcquiredSession: { value: Schema.String },
  ReleasedSession: {},
  FailedAcquireSession: {},
})
export const CanonicalChildKey = Symbol(
  'DeclarationOptionalWrappedKeyedCanonicalChild',
)
export const CanonicalChildBlock = Block.make(
  'DeclarationOptionalWrappedKeyedCanonicalChild',
  {
    key: CanonicalChildKey,
    Model: CanonicalChildModel,
    Message: CanonicalChildMessage,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)
export const CanonicalSession =
  CanonicalChildBlock.makeResource<string>()('CanonicalSession')
export const canonicalSubscriptions = CanonicalChildBlock.makeSubscriptions(
  entry => ({
    ticks: entry('CanonicalTicks', {
      messages: [CanonicalChildMessage.ObservedTick],
      handler: function* () {
        return () => Stream.never
      },
    }),
  }),
)
export const canonicalManagedResources =
  CanonicalChildBlock.makeManagedResources(entry => ({
    session: entry('CanonicalSession', Schema.Option(Schema.Null), {
      resource: CanonicalSession,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: value => CanonicalChildMessage.AcquiredSession({ value }),
      onReleased: CanonicalChildMessage.ReleasedSession,
      onAcquireError: () => CanonicalChildMessage.FailedAcquireSession(),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('session'),
          release: () => Effect.void,
        }
      },
    }),
  }))
export const CanonicalParentModel = Schema.Struct({
  children: Schema.Record(Schema.String, CanonicalChildModel),
})
export const CanonicalParentKey = Symbol(
  'DeclarationOptionalWrappedKeyedCanonicalParent',
)
export const CanonicalParentBlock = Block.make(
  'DeclarationOptionalWrappedKeyedCanonicalParent',
  {
    key: CanonicalParentKey,
    Model: CanonicalParentModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)
export const CanonicalChildrenBinding = CanonicalParentBlock.makeRecordBinding(
  CanonicalChildBlock,
  { field: 'children' },
)
const CanonicalChildComposition = CanonicalChildBlock.makeComposition()
export const canonicalChildLayer = CanonicalChildBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: CanonicalChildComposition.makeInit(() => ({
      model: CanonicalChildModel.make({ count: 0 }),
    })),
    update: CanonicalChildComposition.makeUpdate({
      ObservedTick: model => ({ model }),
      AcquiredSession: model => ({ model }),
      ReleasedSession: model => ({ model }),
      FailedAcquireSession: model => ({ model }),
    }),
    view: CanonicalChildComposition.makeView((_model, h) => h.div([])),
    subscriptions: canonicalSubscriptions,
    managedResources: canonicalManagedResources,
    EffectsLayer: Layer.merge(
      canonicalSubscriptions.ticks.layer,
      canonicalManagedResources.layer,
    ),
  }),
)
const CanonicalParentComposition = CanonicalParentBlock.makeComposition({
  bindings: [CanonicalChildrenBinding],
})
export const canonicalParentLayer = CanonicalParentBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* CanonicalChildrenBinding

    return {
      children: [children],
      init: CanonicalParentComposition.makeInit(() => ({
        model: CanonicalParentModel.make({
          children: { first: CanonicalChildModel.make({ count: 0 }) },
        }),
      })),
      update: CanonicalParentComposition.makeUpdate({}),
      view: CanonicalParentComposition.makeView((_model, h) => h.div([])),
    }
  }),
).pipe(Layer.provide(canonicalChildLayer))
