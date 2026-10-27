import { Layer, Option, Schema, Tuple } from 'effect'
import { Block, Message } from 'foldkit'

export const RoomId = Schema.String.pipe(
  Schema.brand('DeclarationOptionalWrappedKeyedRoomId'),
)
export const RoomModel = Schema.Struct({ count: Schema.Number })
export const RoomMessage = Message.defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
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
        }),
      ),
    operations: {
      setCount: (count: number, context: typeof RoomContext.Type) =>
        Tuple.make(RoomMessage.RequestedSetCount({ count }), context),
    },
    EffectsLayer: Layer.empty,
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
  DeclarationOptionalWrappedKeyedParentDefinition.makeBinding(RoomBlock, {
    field: 'maybeRoomInstance',
    key: 'roomId',
    childField: 'model',
    delivery: {
      when: (model, roomId) =>
        Option.exists(model.maybeRoomInstance, room => room.roomId === roomId),
      toUpdateContext: (_model, roomId) => [{ roomId }],
    },
    subscriptions: {
      when: (model, roomId) =>
        model.isSubscriptionEnabled &&
        Option.exists(model.maybeRoomInstance, room => room.roomId === roomId),
    },
  })
export const LiteralRoomBinding =
  DeclarationOptionalWrappedKeyedParentDefinition.makeBinding(PlainRoomBlock, {
    field: 'maybeLiteralRoomInstance',
    key: 'roomId',
    childField: 'model',
    placement: 'literalRoom',
  })
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
    DeclarationOptionalWrappedKeyedPayloadParentDefinition.makeBinding(
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
