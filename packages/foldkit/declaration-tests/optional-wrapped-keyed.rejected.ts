import { Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import {
  DeclarationOptionalWrappedKeyedParentDefinition,
  LiteralRoomBinding,
  ParentMessage,
  ParentModel,
  RoomBinding,
  RoomBlock,
  RoomId,
  RoomInstance,
  RoomMessage,
  RoomModel,
  roomManagedResources,
  roomSubscriptions,
} from './optional-wrapped-keyed.accepted.js'

declare const roomId: typeof RoomId.Type
const selectedTicks = Scene.Subscription.at(
  RoomBinding,
  roomId,
  roomSubscriptions.ticks,
)
Scene.Subscription.emit(
  selectedTicks,
  // @ts-expect-error The selected Subscription accepts only its declared Message.
  RoomMessage.RequestedSetCount({ count: 1 }),
)
const selectedSession = Scene.ManagedResource.at(
  RoomBinding,
  roomId,
  roomManagedResources.session,
)
Scene.ManagedResource.acquire(
  selectedSession,
  // @ts-expect-error The selected ManagedResource preserves its acquired value type.
  1,
)
Scene.Subscription.at(
  RoomBinding,
  // @ts-expect-error The selected occurrence key must match the keyed Binding.
  1,
  roomSubscriptions.ticks,
)
const foreignSource = roomSubscriptions.ticks
// @ts-expect-error The Subscription source must belong to the keyed child Block.
Scene.Subscription.at(LiteralRoomBinding, 'Primary', foreignSource)

const OptionalRoomInstance = Schema.Struct({
  roomId: Schema.optionalKey(RoomId),
  model: RoomModel,
})
const OptionalRoomModel = Schema.Struct({
  roomId: RoomId,
  model: Schema.optionalKey(RoomModel),
})
const WrongKeyRoomInstance = Schema.Struct({
  roomId: Schema.Boolean,
  model: RoomModel,
})
const IncompatibleRoomInstance = Schema.Struct({
  roomId: RoomId,
  model: Schema.String,
})
const OtherRoomInstance = Schema.Struct({
  roomId: RoomId,
  room: RoomModel,
})
const PrimaryRoomInstance = Schema.Struct({
  _tag: Schema.Literal('Primary'),
  roomId: RoomId,
  model: RoomModel,
})
const SecondaryRoomInstance = Schema.Struct({
  _tag: Schema.Literal('Secondary'),
  roomId: RoomId,
  model: RoomModel,
})
const InvalidModel = Schema.Struct({
  optionalStorage: Schema.optionalKey(Schema.Option(RoomInstance)),
  missingKeyStorage: Schema.Option(OtherRoomInstance),
  optionalKeyStorage: Schema.Option(OptionalRoomInstance),
  wrongKeyStorage: Schema.Option(WrongKeyRoomInstance),
  optionalChildStorage: Schema.Option(OptionalRoomModel),
  incompatibleChildStorage: Schema.Option(IncompatibleRoomInstance),
  ambiguousStorage: Schema.Option(
    Schema.Union([PrimaryRoomInstance, SecondaryRoomInstance]),
  ),
  arrayInOption: Schema.Option(Schema.Array(RoomInstance)),
  maybeRoomInstance: Schema.Option(RoomInstance),
})
const DeclarationOptionalWrappedKeyedInvalidParentDefinition =
  Block.makeDefinition('DeclarationOptionalWrappedKeyedInvalidParent', {
    Model: InvalidModel,
    Message: ParentMessage,
  })

// @ts-expect-error The Option wrapper storage field must be required.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'optionalStorage', key: 'roomId', childField: 'model' },
)
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  // @ts-expect-error The key must name a required wrapper field.
  { field: 'missingKeyStorage', key: 'roomId', childField: 'room' },
)
// @ts-expect-error The wrapper key field cannot be optional.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'optionalKeyStorage', key: 'roomId', childField: 'model' },
)
// @ts-expect-error The wrapper key field must decode to a string or number.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'wrongKeyStorage', key: 'roomId', childField: 'model' },
)
// @ts-expect-error The wrapper child field cannot be optional.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'optionalChildStorage', key: 'roomId', childField: 'model' },
)
// @ts-expect-error The wrapper child field must exactly match the child Model.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'incompatibleChildStorage', key: 'roomId', childField: 'model' },
)
// @ts-expect-error Union wrappers have ambiguous key and child fields.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'ambiguousStorage', key: 'roomId', childField: 'model' },
)
// @ts-expect-error Option storage must directly contain a Struct wrapper.
DeclarationOptionalWrappedKeyedInvalidParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  { field: 'arrayInOption', key: 'roomId', childField: 'model' },
)

const storageField: 'maybeRoomInstance' = 'maybeRoomInstance'
const keyField: 'roomId' = 'roomId'
const childField: 'model' = 'model'
const mixedReadAllConfig = {
  field: storageField,
  key: keyField,
  childField,
  readAll: (model: typeof ParentModel.Type) => [model],
}
// @ts-expect-error Shorthand cannot be mixed with a general keyed reader.
DeclarationOptionalWrappedKeyedParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  mixedReadAllConfig,
)
const mixedReadConfig = {
  field: storageField,
  key: keyField,
  childField,
  read: (instance: typeof RoomInstance.Type) => instance.model,
}
// @ts-expect-error Shorthand cannot be mixed with a custom child reader.
DeclarationOptionalWrappedKeyedParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  mixedReadConfig,
)
const initialConfig = {
  field: storageField,
  key: keyField,
  childField,
  init: {
    instances: (): ReadonlyArray<
      Readonly<{ key: typeof RoomId.Type; args: readonly [number] }>
    > => [],
    toItem: (
      { key }: Readonly<{ key: typeof RoomId.Type }>,
      model: typeof RoomModel.Type,
    ) => ({ roomId: key, model, label: 'Room' }),
  },
}
// @ts-expect-error Option presence is parent-owned and cannot use init.instances assembly.
DeclarationOptionalWrappedKeyedParentDefinition.makeOptionalKeyedFieldBinding(
  RoomBlock,
  initialConfig,
)
