import { Layer, Schema } from 'effect'
import { Block, Message, Update } from 'foldkit'

import {
  ArrayChildBlock,
  ChildBlock,
  DeclarationKeyedFieldParentDefinition,
  ParentMessage,
} from './keyed-field-binding.accepted.js'

const entriesField = 'entries'
const wrappedRowsField = 'wrappedRows'
const missingField = 'missing'
const idKey = 'id'
const missingKey = 'missing'
const wrongModelConfig = {
  field: wrappedRowsField,
  key: idKey,
}
// @ts-expect-error The selected field must be an exact child Model array.
DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, wrongModelConfig)

const missingFieldConfig = {
  field: missingField,
  key: idKey,
}
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  // @ts-expect-error The selected field must name a parent Struct field.
  missingFieldConfig,
)

const missingKeyConfig = {
  field: entriesField,
  key: missingKey,
}
// @ts-expect-error The key must name a field on the child Model.
DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, missingKeyConfig)

const omittedKeyConfig = {
  field: entriesField,
}
// @ts-expect-error A direct keyed Binding requires a child key field.
DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, omittedKeyConfig)

const conflictingReadAllConfig = {
  field: entriesField,
  key: idKey,
  readAll: (model: typeof DeclarationKeyedFieldParentDefinition.Model.Type) =>
    model.entries,
}
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  // @ts-expect-error A direct keyed Binding cannot supply collection accessors.
  conflictingReadAllConfig,
)

const conflictingPresenceConfig = {
  field: entriesField,
  key: idKey,
  presentWhen: () => true,
}
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  // @ts-expect-error presentWhen belongs to a static direct Binding.
  conflictingPresenceConfig,
)

const conflictingWriteConfig = {
  field: entriesField,
  key: idKey,
  write: (model: typeof DeclarationKeyedFieldParentDefinition.Model.Type) =>
    model,
}
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  // @ts-expect-error A direct keyed Binding cannot supply a custom write adapter.
  conflictingWriteConfig,
)

const parentMessageConfig = {
  field: entriesField,
  key: idKey,
  parentMessage: ParentMessage.IgnoredChildMessage,
}
// @ts-expect-error Generated child delivery does not accept an authored parent Message constructor.
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  parentMessageConfig,
)

const unexpectedOutMessageConfig = {
  field: entriesField,
  key: idKey,
  outMessage: { fold: () => undefined },
}
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  // @ts-expect-error A child without OutMessages cannot configure an OutMessage policy.
  unexpectedOutMessageConfig,
)

const foreignMappingConfig = {
  field: entriesField,
  key: idKey,
  toParentMessage: () => ({ _tag: 'ForeignMessage' }),
}
// @ts-expect-error Generated child delivery does not accept an authored mapper.
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  foreignMappingConfig,
)

// @ts-expect-error Keyed init must store the initialized child Model directly.
// oxfmt-ignore
DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, { field: 'entries', key: 'id', init: { instances: () => [{ key: 'initial', args: [] }], toItem: (_occurrence, child) => ({ child }) } })

// @ts-expect-error init.occurrences was replaced by init.instances.
// oxfmt-ignore
DeclarationKeyedFieldParentDefinition.makeBinding(ChildBlock, { field: entriesField, key: idKey, init: { occurrences: () => [{ key: 'initial', args: [] }], toItem: (_instance, child) => child } })

const BooleanKeyModel = Schema.Struct({
  id: Schema.Boolean,
  count: Schema.Number,
})
const BooleanKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })

const DeclarationBooleanKeyChildComposition = Block.makeDefinition(
  'DeclarationBooleanKeyChild',
  {
    Model: BooleanKeyModel,
    Message: BooleanKeyMessage,
  },
).makeComposition()
const prepareBooleanKeyBlock = () =>
  DeclarationBooleanKeyChildComposition.prepareBlock({
    init: DeclarationBooleanKeyChildComposition.makeInit(() => ({
      model: BooleanKeyModel.make({ id: false, count: 0 }),
    })),
    update: DeclarationBooleanKeyChildComposition.makeUpdate({
      UpdatedCount: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const BooleanKeyBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof BooleanKeyModel,
  typeof prepareBooleanKeyBlock
> = Block.assemble(prepareBooleanKeyBlock)
const BooleanKeyParentModel = Schema.Struct({
  entries: Schema.Array(BooleanKeyModel),
})
const DeclarationBooleanKeyParentDefinition = Block.makeDefinition(
  'DeclarationBooleanKeyParent',
  {
    Model: BooleanKeyParentModel,
    Message: Schema.Never,
  },
)
const booleanKeyConfig = {
  field: entriesField,
  key: idKey,
}
DeclarationBooleanKeyParentDefinition.makeBinding(
  BooleanKeyBlock,
  // @ts-expect-error Child occurrence keys must be strings or numbers.
  booleanKeyConfig,
)

const OptionalKeyModel = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  count: Schema.Number,
})
const OptionalKeyMessage = Message.defineMessageUnion({ UpdatedCount: {} })

const DeclarationOptionalKeyChildComposition = Block.makeDefinition(
  'DeclarationOptionalKeyChild',
  {
    Model: OptionalKeyModel,
    Message: OptionalKeyMessage,
  },
).makeComposition()
const prepareOptionalKeyBlock = () =>
  DeclarationOptionalKeyChildComposition.prepareBlock({
    init: DeclarationOptionalKeyChildComposition.makeInit(() => ({
      model: OptionalKeyModel.make({ count: 0 }),
    })),
    update: DeclarationOptionalKeyChildComposition.makeUpdate({
      UpdatedCount: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const OptionalKeyBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof OptionalKeyModel,
  typeof prepareOptionalKeyBlock
> = Block.assemble(prepareOptionalKeyBlock)
const OptionalKeyParentModel = Schema.Struct({
  entries: Schema.Array(OptionalKeyModel),
})
const DeclarationOptionalKeyParentDefinition = Block.makeDefinition(
  'DeclarationOptionalKeyParent',
  {
    Model: OptionalKeyParentModel,
    Message: Schema.Never,
  },
)
const optionalKeyConfig = {
  field: entriesField,
  key: idKey,
}
DeclarationOptionalKeyParentDefinition.makeBinding(
  OptionalKeyBlock,
  // @ts-expect-error A child key field must be required.
  optionalKeyConfig,
)

const ExtendedChildModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
  note: Schema.optionalKey(Schema.String),
})
const ExtendedParentModel = Schema.Struct({
  entries: Schema.Array(ExtendedChildModel),
})
const DeclarationExtendedKeyParentDefinition = Block.makeDefinition(
  'DeclarationExtendedKeyParent',
  {
    Model: ExtendedParentModel,
    Message: ParentMessage,
  },
)
const extendedFieldConfig = {
  field: entriesField,
  key: idKey,
}
DeclarationExtendedKeyParentDefinition.makeBinding(
  ChildBlock,
  // @ts-expect-error The field element cannot have extra optional properties.
  extendedFieldConfig,
)

const PrimitiveMessage = Message.defineMessageUnion({ UpdatedValue: {} })

const DeclarationPrimitiveKeyChildComposition = Block.makeDefinition(
  'DeclarationPrimitiveKeyChild',
  {
    Model: Schema.String,
    Message: PrimitiveMessage,
  },
).makeComposition()
const preparePrimitiveBlock = () =>
  DeclarationPrimitiveKeyChildComposition.prepareBlock({
    init: DeclarationPrimitiveKeyChildComposition.makeInit(() => ({
      model: 'initial',
    })),
    update: DeclarationPrimitiveKeyChildComposition.makeUpdate({
      UpdatedValue: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const PrimitiveBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Schema.String,
  typeof preparePrimitiveBlock
> = Block.assemble(preparePrimitiveBlock)
const PrimitiveParentModel = Schema.Struct({
  entries: Schema.Array(Schema.String),
})
const DeclarationPrimitiveKeyParentDefinition = Block.makeDefinition(
  'DeclarationPrimitiveKeyParent',
  {
    Model: PrimitiveParentModel,
    Message: Schema.Never,
  },
)
const primitiveKeyConfig = {
  field: entriesField,
  key: 'length',
}
DeclarationPrimitiveKeyParentDefinition.makeBinding(
  PrimitiveBlock,
  // @ts-expect-error A keyed child Model must be an object Struct.
  primitiveKeyConfig,
)

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

const DeclarationUnionKeyChildComposition = Block.makeDefinition(
  'DeclarationUnionKeyChild',
  {
    Model: UnionKeyModel,
    Message: UnionKeyMessage,
  },
).makeComposition()
const prepareUnionKeyBlock = () =>
  DeclarationUnionKeyChildComposition.prepareBlock({
    init: DeclarationUnionKeyChildComposition.makeInit(() => ({
      model: UnionKeyModel.make({
        _tag: 'Primary',
        id: 'initial',
        count: 0,
      }),
    })),
    update: DeclarationUnionKeyChildComposition.makeUpdate({
      UpdatedCount: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const UnionKeyBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof UnionKeyModel,
  typeof prepareUnionKeyBlock
> = Block.assemble(prepareUnionKeyBlock)
const UnionKeyParentModel = Schema.Struct({
  entries: Schema.Array(UnionKeyModel),
})
const DeclarationUnionKeyParentDefinition = Block.makeDefinition(
  'DeclarationUnionKeyParent',
  {
    Model: UnionKeyParentModel,
    Message: Schema.Never,
  },
)
const unionKeyConfig = {
  field: entriesField,
  key: idKey,
}
// @ts-expect-error Direct keyed shorthand requires a Struct child Model schema.
DeclarationUnionKeyParentDefinition.makeBinding(UnionKeyBlock, unionKeyConfig)

const ArrayCollectionParentModel = Schema.Struct({
  entries: Schema.Array(ArrayChildBlock.Model),
})
const DeclarationArrayCollectionParentDefinition = Block.makeDefinition(
  'DeclarationArrayCollectionParent',
  {
    Model: ArrayCollectionParentModel,
    Message: ParentMessage,
  },
)
const arrayModelKeyConfig = {
  field: entriesField,
  key: 'length',
}
DeclarationArrayCollectionParentDefinition.makeBinding(
  ArrayChildBlock,
  // @ts-expect-error An Array child Model has no Struct key fields.
  arrayModelKeyConfig,
)

const InvalidKeyModel = Schema.Struct({
  nullKey: Schema.Null,
  unknownKey: Schema.Unknown,
  neverKey: Schema.Never,
  anyKey: Schema.Any,
})
const InvalidKeyMessage = Message.defineMessageUnion({ UpdatedValue: {} })

const DeclarationInvalidKeyChildComposition = Block.makeDefinition(
  'DeclarationInvalidKeyChild',
  {
    Model: InvalidKeyModel,
    Message: InvalidKeyMessage,
  },
).makeComposition()
const prepareInvalidKeyBlock = () =>
  DeclarationInvalidKeyChildComposition.prepareBlock({
    init: DeclarationInvalidKeyChildComposition.makeInit(
      (): Update.Return<
        typeof InvalidKeyModel.Type,
        typeof InvalidKeyMessage.Type
      > => {
        throw new Error('Uninhabited declaration fixture')
      },
    ),
    update: DeclarationInvalidKeyChildComposition.makeUpdate({
      UpdatedValue: model => ({
        model,
      }),
    }),
    EffectsLayer: Layer.empty,
  })
const InvalidKeyBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof InvalidKeyModel,
  typeof prepareInvalidKeyBlock
> = Block.assemble(prepareInvalidKeyBlock)
const InvalidKeyParentModel = Schema.Struct({
  entries: Schema.Array(InvalidKeyModel),
})
const DeclarationInvalidKeyParentDefinition = Block.makeDefinition(
  'DeclarationInvalidKeyParent',
  {
    Model: InvalidKeyParentModel,
    Message: Schema.Never,
  },
)
const nullKey = 'nullKey'
const unknownKey = 'unknownKey'
const neverKey = 'neverKey'
const anyKey = 'anyKey'
const nullKeyConfig = {
  field: entriesField,
  key: nullKey,
}
const unknownKeyConfig = {
  field: entriesField,
  key: unknownKey,
}
const neverKeyConfig = {
  field: entriesField,
  key: neverKey,
}
const anyKeyConfig = {
  field: entriesField,
  key: anyKey,
}

DeclarationInvalidKeyParentDefinition.makeBinding(
  InvalidKeyBlock,
  // @ts-expect-error Null is not an occurrence key type.
  nullKeyConfig,
)
DeclarationInvalidKeyParentDefinition.makeBinding(
  InvalidKeyBlock,
  // @ts-expect-error Unknown is not an occurrence key type.
  unknownKeyConfig,
)
DeclarationInvalidKeyParentDefinition.makeBinding(
  InvalidKeyBlock,
  // @ts-expect-error Never is not an occurrence key type.
  neverKeyConfig,
)
// @ts-expect-error Any is not an occurrence key type.
DeclarationInvalidKeyParentDefinition.makeBinding(InvalidKeyBlock, anyKeyConfig)

const repeatedModelConfig: Readonly<{
  field: 'entries'
  key: 'id'
  Model: typeof Schema.String
}> = {
  field: entriesField,
  key: idKey,
  Model: Schema.String,
}
// @ts-expect-error Assigned configs cannot override the owning Definition's Model.
DeclarationKeyedFieldParentDefinition.makeBinding(
  ChildBlock,
  repeatedModelConfig,
)
