import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ChildBlock } from './keyed-map-field.accepted.js'

const WrongWrapper = Schema.Struct({ child: Schema.String })
const OptionalWrapper = Schema.Struct({
  child: Schema.optionalKey(ChildBlock.Model),
})
const InvalidModel = Schema.Struct({
  numericRecord: Schema.Record(Schema.Number, ChildBlock.Model),
  compositeMap: Schema.HashMap(
    Schema.Struct({ bound: Schema.String, column: Schema.String }),
    ChildBlock.Model,
  ),
  neverRecord: Schema.Record(Schema.Never, ChildBlock.Model),
  neverMap: Schema.HashMap(Schema.Never, ChildBlock.Model),
  wrongValues: Schema.Record(Schema.String, Schema.String),
  wrongWrappers: Schema.Record(Schema.String, WrongWrapper),
  optionalWrappers: Schema.HashMap(Schema.String, OptionalWrapper),
  optionalMap: Schema.optionalKey(
    Schema.HashMap(Schema.String, ChildBlock.Model),
  ),
})
const InvalidDefinition = Block.makeDefinition('InvalidKeyedMapParent', {
  Model: InvalidModel,
  Message: Schema.Never,
})

// @ts-expect-error Record map shorthand does not coerce numeric property keys.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'numericRecord' })

// @ts-expect-error Composite HashMap keys are not primitive occurrence identities.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'compositeMap' })

// @ts-expect-error Never cannot produce a child occurrence identity.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'neverRecord' })

// @ts-expect-error Never cannot produce a child occurrence identity.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'neverMap' })

// @ts-expect-error The map value must exactly match the child Model.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'wrongValues' })

const wrongWrapperConfig = {
  field: 'wrongWrappers',
  childField: 'child',
}
// @ts-expect-error The declared wrapper child field has an incompatible Schema.
InvalidDefinition.makeMapBinding(ChildBlock, wrongWrapperConfig)

const optionalWrapperConfig = {
  field: 'optionalWrappers',
  childField: 'child',
}
// @ts-expect-error A wrapper child field must be required.
InvalidDefinition.makeMapBinding(ChildBlock, optionalWrapperConfig)

// @ts-expect-error The parent map field must be required.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'optionalMap' })

const ValidModel = Schema.Struct({
  childrenById: Schema.Record(Schema.String, ChildBlock.Model),
  otherChildrenById: Schema.Record(Schema.String, ChildBlock.Model),
  pairsById: Schema.Record(
    Schema.String,
    Schema.Struct({ lower: ChildBlock.Model, upper: ChildBlock.Model }),
  ),
})
const ValidDefinition = Block.makeDefinition('ValidKeyedMapParent', {
  Model: ValidModel,
  Message: Schema.Never,
})

const FakeDefinition = {
  Model: ValidModel,
  Message: Schema.Never,
  makeBinding: () => ({}),
}

// @ts-expect-error A lookalike object must implement the Definition's full Binding constructor contract.
FakeDefinition.makeMapBinding(ChildBlock, { field: 'childrenById' })

const conflictingReadAllConfig = {
  field: 'childrenById',
  readAll: () => [],
}
// @ts-expect-error Map shorthand derives readAll and rejects custom readers.
ValidDefinition.makeMapBinding(ChildBlock, conflictingReadAllConfig)

const conflictingKeyConfig = {
  field: 'childrenById',
  key: 'count',
}
// @ts-expect-error Map shorthand derives identity from the property key.
ValidDefinition.makeMapBinding(ChildBlock, conflictingKeyConfig)

const conflictingWriterConfig = {
  field: 'childrenById',
  writeAt: (model: typeof ValidModel.Type) => model,
}
// @ts-expect-error Map shorthand derives an existing-only writer.
ValidDefinition.makeMapBinding(ChildBlock, conflictingWriterConfig)

const conflictingPresenceConfig = {
  field: 'childrenById',
  presentWhen: () => true,
}
// @ts-expect-error Presence comes from property membership, not presentWhen.
ValidDefinition.makeMapBinding(ChildBlock, conflictingPresenceConfig)

const conflictingKeySchemaConfig = {
  field: 'childrenById',
  keySchema: Schema.String,
}
// @ts-expect-error The map field supplies the key Schema.
ValidDefinition.makeMapBinding(ChildBlock, conflictingKeySchemaConfig)
