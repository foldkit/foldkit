import { Layer, Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'

import {
  ArrayChildBlock,
  ChildBlock,
  DeclarationKeyedFieldParent,
  ParentMessage,
} from './keyed-field-binding.accepted.js'

const entriesField = 'entries'
const wrappedRowsField = 'wrappedRows'
const missingField = 'missing'
const idKey = 'id'
const missingKey = 'missing'
const toEntryMessage = (id: string, message: typeof ChildBlock.Message.Type) =>
  ParentMessage.GotEntryMessage({ id, message })

const wrongModelConfig = {
  field: wrappedRowsField,
  key: idKey,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error The selected field must be an exact child Model array.
DeclarationKeyedFieldParent.bindChild(ChildBlock, wrongModelConfig)

const missingFieldConfig = {
  field: missingField,
  key: idKey,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error The selected field must name a parent Struct field.
DeclarationKeyedFieldParent.bindChild(ChildBlock, missingFieldConfig)

const missingKeyConfig = {
  field: entriesField,
  key: missingKey,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error The key must name a field on the child Model.
DeclarationKeyedFieldParent.bindChild(ChildBlock, missingKeyConfig)

const omittedKeyConfig = {
  field: entriesField,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error A direct keyed Binding requires a child key field.
DeclarationKeyedFieldParent.bindChild(ChildBlock, omittedKeyConfig)

const conflictingReadAllConfig = {
  field: entriesField,
  key: idKey,
  readAll: (model: typeof DeclarationKeyedFieldParent.Model.Type) =>
    model.entries,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error A direct keyed Binding cannot supply collection accessors.
DeclarationKeyedFieldParent.bindChild(ChildBlock, conflictingReadAllConfig)

const conflictingPresenceConfig = {
  field: entriesField,
  key: idKey,
  presentWhen: () => true,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error presentWhen belongs to a static direct Binding.
DeclarationKeyedFieldParent.bindChild(ChildBlock, conflictingPresenceConfig)

const conflictingWriteConfig = {
  field: entriesField,
  key: idKey,
  write: (model: typeof DeclarationKeyedFieldParent.Model.Type) => model,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error A direct keyed Binding cannot supply a custom write adapter.
DeclarationKeyedFieldParent.bindChild(ChildBlock, conflictingWriteConfig)

const parentMessageConfig = {
  field: entriesField,
  key: idKey,
  parentMessage: ParentMessage.GotEntryMessage,
}
// @ts-expect-error Keyed Bindings require an explicit key-aware mapper.
DeclarationKeyedFieldParent.bindChild(ChildBlock, parentMessageConfig)

const unexpectedOutMessageConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
  outMessage: { fold: () => undefined },
}
// @ts-expect-error A child without OutMessages cannot configure an OutMessage policy.
DeclarationKeyedFieldParent.bindChild(ChildBlock, unexpectedOutMessageConfig)

const foreignMappingConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: () => ({ _tag: 'ForeignMessage' }),
  fromParentMessage: false satisfies false,
}
// @ts-expect-error A keyed mapper must return the established parent Message.
DeclarationKeyedFieldParent.bindChild(ChildBlock, foreignMappingConfig)

DeclarationKeyedFieldParent.bindChild(ChildBlock, {
  // @ts-expect-error Keyed init must store the initialized child Model directly.
  field: 'entries',
  // @ts-expect-error Keyed init must store the initialized child Model directly.
  key: 'id',
  // @ts-expect-error Keyed init must store the initialized child Model directly.
  toParentMessage: toEntryMessage,
  // @ts-expect-error Keyed init must store the initialized child Model directly.
  fromParentMessage: false,
  // @ts-expect-error Keyed init must store the initialized child Model directly.
  init: {
    occurrences: () => [{ key: 'initial', args: [] }],
    toItem: (_occurrence, child) => ({ child }),
  },
})

const BooleanKeyModel = Schema.Struct({
  id: Schema.Boolean,
  count: Schema.Number,
})
const BooleanKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })
const DeclarationBooleanKeyChild = Block.define('DeclarationBooleanKeyChild', {
  Model: BooleanKeyModel,
  Message: BooleanKeyMessage,
})
const DeclarationBooleanKeyChildComposition =
  DeclarationBooleanKeyChild.makeComposition()
const BooleanKeyBlock = DeclarationBooleanKeyChildComposition.makeBlock({
  init: DeclarationBooleanKeyChildComposition.makeInit(() => ({
    model: BooleanKeyModel.make({ id: false, count: 0 }),
  })),
  update: DeclarationBooleanKeyChildComposition.makeUpdate(model => ({
    model,
  })),
  EffectsLayer: Layer.empty,
})
const BooleanKeyParentModel = Schema.Struct({
  entries: Schema.Array(BooleanKeyModel),
})
const BooleanKeyParentMessage = Message.defineMessageUnion({
  GotChildMessage: { id: Schema.Boolean, message: BooleanKeyBlock.Message },
})
const DeclarationBooleanKeyParent = Block.define(
  'DeclarationBooleanKeyParent',
  {
    Model: BooleanKeyParentModel,
    Message: BooleanKeyParentMessage,
  },
)
const booleanKeyConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: (id: boolean, message: typeof BooleanKeyMessage.Type) =>
    BooleanKeyParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: false satisfies false,
}
// @ts-expect-error Child occurrence keys must be strings or numbers.
DeclarationBooleanKeyParent.bindChild(BooleanKeyBlock, booleanKeyConfig)

const OptionalKeyModel = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  count: Schema.Number,
})
const OptionalKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })
const DeclarationOptionalKeyChild = Block.define(
  'DeclarationOptionalKeyChild',
  {
    Model: OptionalKeyModel,
    Message: OptionalKeyMessage,
  },
)
const DeclarationOptionalKeyChildComposition =
  DeclarationOptionalKeyChild.makeComposition()
const OptionalKeyBlock = DeclarationOptionalKeyChildComposition.makeBlock({
  init: DeclarationOptionalKeyChildComposition.makeInit(() => ({
    model: OptionalKeyModel.make({ count: 0 }),
  })),
  update: DeclarationOptionalKeyChildComposition.makeUpdate(model => ({
    model,
  })),
  EffectsLayer: Layer.empty,
})
const OptionalKeyParentModel = Schema.Struct({
  entries: Schema.Array(OptionalKeyModel),
})
const OptionalKeyParentMessage = Message.defineMessageUnion({
  GotChildMessage: { id: Schema.String, message: OptionalKeyBlock.Message },
})
const DeclarationOptionalKeyParent = Block.define(
  'DeclarationOptionalKeyParent',
  {
    Model: OptionalKeyParentModel,
    Message: OptionalKeyParentMessage,
  },
)
const optionalKeyConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: (id: string, message: typeof OptionalKeyMessage.Type) =>
    OptionalKeyParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: false satisfies false,
}
// @ts-expect-error A child key field must be required.
DeclarationOptionalKeyParent.bindChild(OptionalKeyBlock, optionalKeyConfig)

const ExtendedChildModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
  note: Schema.optionalKey(Schema.String),
})
const ExtendedParentModel = Schema.Struct({
  entries: Schema.Array(ExtendedChildModel),
})
const DeclarationExtendedKeyParent = Block.define(
  'DeclarationExtendedKeyParent',
  {
    Model: ExtendedParentModel,
    Message: ParentMessage,
  },
)
const extendedFieldConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error The field element cannot have extra optional properties.
DeclarationExtendedKeyParent.bindChild(ChildBlock, extendedFieldConfig)

const PrimitiveMessage = Message.defineMessageUnion({ UpdatedValue: {} })
const DeclarationPrimitiveKeyChild = Block.define(
  'DeclarationPrimitiveKeyChild',
  {
    Model: Schema.String,
    Message: PrimitiveMessage,
  },
)
const DeclarationPrimitiveKeyChildComposition =
  DeclarationPrimitiveKeyChild.makeComposition()
const PrimitiveBlock = DeclarationPrimitiveKeyChildComposition.makeBlock({
  init: DeclarationPrimitiveKeyChildComposition.makeInit(() => ({
    model: 'initial',
  })),
  update: DeclarationPrimitiveKeyChildComposition.makeUpdate(model => ({
    model,
  })),
  EffectsLayer: Layer.empty,
})
const PrimitiveParentModel = Schema.Struct({
  entries: Schema.Array(Schema.String),
})
const PrimitiveParentMessage = Message.defineMessageUnion({
  GotChildMessage: { id: Schema.Number, message: PrimitiveBlock.Message },
})
const DeclarationPrimitiveKeyParent = Block.define(
  'DeclarationPrimitiveKeyParent',
  {
    Model: PrimitiveParentModel,
    Message: PrimitiveParentMessage,
  },
)
const primitiveKeyConfig = {
  field: entriesField,
  key: 'length',
  toParentMessage: (id: number, message: typeof PrimitiveMessage.Type) =>
    PrimitiveParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: false satisfies false,
}
// @ts-expect-error A keyed child Model must be an object Struct.
DeclarationPrimitiveKeyParent.bindChild(PrimitiveBlock, primitiveKeyConfig)

const UnionKeyModel = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal('Primary'),
    id: Schema.String,
    count: Schema.Number,
  }),
  Schema.Struct({
    _tag: Schema.Literal('Secondary'),
    id: Schema.String,
    count: Schema.Number,
  }),
])
const UnionKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })
const DeclarationUnionKeyChild = Block.define('DeclarationUnionKeyChild', {
  Model: UnionKeyModel,
  Message: UnionKeyMessage,
})
const DeclarationUnionKeyChildComposition =
  DeclarationUnionKeyChild.makeComposition()
const UnionKeyBlock = DeclarationUnionKeyChildComposition.makeBlock({
  init: DeclarationUnionKeyChildComposition.makeInit(() => ({
    model: UnionKeyModel.make({
      _tag: 'Primary',
      id: 'initial',
      count: 0,
    }),
  })),
  update: DeclarationUnionKeyChildComposition.makeUpdate(model => ({ model })),
  EffectsLayer: Layer.empty,
})
const UnionKeyParentModel = Schema.Struct({
  entries: Schema.Array(UnionKeyModel),
})
const UnionKeyParentMessage = Message.defineMessageUnion({
  GotChildMessage: { id: Schema.String, message: UnionKeyBlock.Message },
})
const DeclarationUnionKeyParent = Block.define('DeclarationUnionKeyParent', {
  Model: UnionKeyParentModel,
  Message: UnionKeyParentMessage,
})
const unionKeyConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: (id: string, message: typeof UnionKeyMessage.Type) =>
    UnionKeyParentMessage.GotChildMessage({ id, message }),
  fromParentMessage: false satisfies false,
}
// @ts-expect-error Direct keyed shorthand requires a Struct child Model schema.
DeclarationUnionKeyParent.bindChild(UnionKeyBlock, unionKeyConfig)

const ArrayCollectionParentModel = Schema.Struct({
  entries: Schema.Array(ArrayChildBlock.Model),
})
const DeclarationArrayCollectionParent = Block.define(
  'DeclarationArrayCollectionParent',
  {
    Model: ArrayCollectionParentModel,
    Message: ParentMessage,
  },
)
const arrayModelKeyConfig = {
  field: entriesField,
  key: 'length',
  toParentMessage: (
    _length: number,
    message: typeof ArrayChildBlock.Message.Type,
  ) => ParentMessage.GotArrayChildMessage({ message }),
  fromParentMessage: false satisfies false,
}
// @ts-expect-error An Array child Model has no Struct key fields.
DeclarationArrayCollectionParent.bindChild(ArrayChildBlock, arrayModelKeyConfig)

const InvalidKeyModel = Schema.Struct({
  nullKey: Schema.Null,
  unknownKey: Schema.Unknown,
  neverKey: Schema.Never,
  anyKey: Schema.Any,
})
const InvalidKeyMessage = Message.defineMessageUnion({ UpdatedValue: {} })
const DeclarationInvalidKeyChild = Block.define('DeclarationInvalidKeyChild', {
  Model: InvalidKeyModel,
  Message: InvalidKeyMessage,
})
const DeclarationInvalidKeyChildComposition =
  DeclarationInvalidKeyChild.makeComposition()
const InvalidKeyBlock = DeclarationInvalidKeyChildComposition.makeBlock({
  init: DeclarationInvalidKeyChildComposition.makeInit(
    (): Update.Return<
      typeof InvalidKeyModel.Type,
      typeof InvalidKeyMessage.Type
    > => {
      throw new Error('Uninhabited declaration fixture')
    },
  ),
  update: DeclarationInvalidKeyChildComposition.makeUpdate(model => ({
    model,
  })),
  EffectsLayer: Layer.empty,
})
const InvalidKeyParentModel = Schema.Struct({
  entries: Schema.Array(InvalidKeyModel),
})
const InvalidKeyParentMessage = Message.defineMessageUnion({
  GotChildMessage: { message: InvalidKeyBlock.Message },
})
const DeclarationInvalidKeyParent = Block.define(
  'DeclarationInvalidKeyParent',
  {
    Model: InvalidKeyParentModel,
    Message: InvalidKeyParentMessage,
  },
)
const toInvalidKeyMessage = (
  _key: unknown,
  message: typeof InvalidKeyMessage.Type,
) => InvalidKeyParentMessage.GotChildMessage({ message })

const nullKey = 'nullKey'
const unknownKey = 'unknownKey'
const neverKey = 'neverKey'
const anyKey = 'anyKey'
const nullKeyConfig = {
  field: entriesField,
  key: nullKey,
  toParentMessage: toInvalidKeyMessage,
  fromParentMessage: false satisfies false,
}
const unknownKeyConfig = {
  field: entriesField,
  key: unknownKey,
  toParentMessage: toInvalidKeyMessage,
  fromParentMessage: false satisfies false,
}
const neverKeyConfig = {
  field: entriesField,
  key: neverKey,
  toParentMessage: toInvalidKeyMessage,
  fromParentMessage: false satisfies false,
}
const anyKeyConfig = {
  field: entriesField,
  key: anyKey,
  toParentMessage: toInvalidKeyMessage,
  fromParentMessage: false satisfies false,
}

// @ts-expect-error Null is not an occurrence key type.
DeclarationInvalidKeyParent.bindChild(InvalidKeyBlock, nullKeyConfig)
// @ts-expect-error Unknown is not an occurrence key type.
DeclarationInvalidKeyParent.bindChild(InvalidKeyBlock, unknownKeyConfig)
// @ts-expect-error Never is not an occurrence key type.
DeclarationInvalidKeyParent.bindChild(InvalidKeyBlock, neverKeyConfig)
// @ts-expect-error Any is not an occurrence key type.
DeclarationInvalidKeyParent.bindChild(InvalidKeyBlock, anyKeyConfig)

const repeatedModelConfig: Readonly<{
  field: 'entries'
  key: 'id'
  Model: typeof Schema.String
  toParentMessage: typeof toEntryMessage
  fromParentMessage: false
}> = {
  field: entriesField,
  key: idKey,
  Model: Schema.String,
  toParentMessage: toEntryMessage,
  fromParentMessage: false satisfies false,
}
// @ts-expect-error Assigned configs cannot override the owning Definition's Model.
DeclarationKeyedFieldParent.bindChild(ChildBlock, repeatedModelConfig)
