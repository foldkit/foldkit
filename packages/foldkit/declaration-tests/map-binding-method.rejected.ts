import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { initAndInsert } from 'foldkit/bindingInit'
// @ts-expect-error Map Bindings are authored through the owning Definition.
import { makeMapBinding as standaloneMapBinding } from 'foldkit/mapBinding'

import {
  ChildBlock,
  ChildrenBinding,
  Id,
  ParentDefinition,
  PickerBinding,
  RowsBinding,
  init,
  insert,
  makeMapBinding,
} from './map-binding-method.accepted.js'

void standaloneMapBinding

// @ts-expect-error A contextful child requires its generated delivery context.
makeMapBinding(ChildBlock, { field: 'children' })
makeMapBinding(ChildBlock, {
  field: 'children',
  // @ts-expect-error The required update context keeps its exact numeric payload.
  delivery: { toUpdateContext: () => [{ multiplier: 'wrong' }] },
})
makeMapBinding(ChildBlock, {
  field: 'children',
  // @ts-expect-error An empty tuple cannot supply the required child update context.
  delivery: { toUpdateContext: () => [] },
})

declare const anyConfig: any
declare const unknownConfig: unknown
declare const anyBlock: any
declare const unknownBlock: unknown
// @ts-expect-error An any config cannot erase map storage validation.
makeMapBinding(ChildBlock, anyConfig)
// @ts-expect-error An unknown config does not establish map storage.
makeMapBinding(ChildBlock, unknownConfig)
// @ts-expect-error An any Block cannot erase the exact child contract.
makeMapBinding(anyBlock, { field: 'children' })
// @ts-expect-error An unknown value is not a completed child Block.
makeMapBinding(unknownBlock, { field: 'children' })

const InvalidModel = Schema.Struct({
  wrong: Schema.Record(Schema.String, Schema.String),
  anyValues: Schema.Record(Schema.String, Schema.Any),
  unknownValues: Schema.Record(Schema.String, Schema.Unknown),
  numericRecord: Schema.Record(Schema.Number, ChildBlock.Model),
  objectKey: Schema.HashMap(
    Schema.Struct({ id: Schema.String }),
    ChildBlock.Model,
  ),
  anyKey: Schema.HashMap(Schema.Any, ChildBlock.Model),
  unknownKey: Schema.HashMap(Schema.Unknown, ChildBlock.Model),
  neverKey: Schema.HashMap(Schema.Never, ChildBlock.Model),
  optional: Schema.optionalKey(Schema.Record(Id, ChildBlock.Model)),
  optionalChild: Schema.Record(
    Id,
    Schema.Struct({ child: Schema.optionalKey(ChildBlock.Model) }),
  ),
  wrongChild: Schema.Record(Id, Schema.Struct({ child: Schema.String })),
})
const InvalidDefinition = Block.makeDefinition('MapMethodInvalidParent', {
  Model: InvalidModel,
  Message: Schema.Never,
})
const delivery = { toUpdateContext: () => Tuple.make({ multiplier: 1 }) }
// @ts-expect-error Values must match the exact child Model.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'wrong', delivery })
// @ts-expect-error Any-valued maps cannot establish exact child storage.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'anyValues', delivery })
InvalidDefinition.makeMapBinding(ChildBlock, {
  // @ts-expect-error Unknown-valued maps cannot establish exact child storage.
  field: 'unknownValues',
  delivery,
})
InvalidDefinition.makeMapBinding(ChildBlock, {
  // @ts-expect-error Numeric Record keys are not silently coerced to strings.
  field: 'numericRecord',
  delivery,
})
// @ts-expect-error Composite keys are not occurrence identities.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'objectKey', delivery })
// @ts-expect-error Any keys do not prove primitive occurrence identities.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'anyKey', delivery })
// @ts-expect-error Unknown keys do not prove primitive occurrence identities.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'unknownKey', delivery })
// @ts-expect-error Never cannot supply an occurrence key.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'neverKey', delivery })
// @ts-expect-error Parent map storage must be required.
InvalidDefinition.makeMapBinding(ChildBlock, { field: 'optional', delivery })
InvalidDefinition.makeMapBinding(ChildBlock, {
  // @ts-expect-error Wrapped child storage must be required.
  field: 'optionalChild',
  childField: 'child',
  delivery,
})
InvalidDefinition.makeMapBinding(ChildBlock, {
  // @ts-expect-error Wrapped child storage must have the child's exact Model.
  field: 'wrongChild',
  childField: 'child',
  delivery,
})
// @ts-expect-error The shorthand owns lookup and does not accept a custom reader.
makeMapBinding(ChildBlock, { field: 'children', delivery, readAll: () => [] })
// @ts-expect-error The shorthand derives keys from the map Schema.
makeMapBinding(ChildBlock, {
  field: 'children',
  delivery,
  keySchema: Schema.String,
})
// @ts-expect-error Wrapper storage needs its explicitly named child field.
makeMapBinding(ChildBlock, { field: 'rows', delivery })
// @ts-expect-error A direct map's child Model does not contain a wrapper field.
makeMapBinding(ChildBlock, { field: 'children', childField: 'child', delivery })

const model = init(1).model
const id = Id.make('first')
// @ts-expect-error Insertions retain the branded occurrence key.
initAndInsert(ChildrenBinding, model, { key: 'first', args: [1] })
// @ts-expect-error Child initialization retains its required first argument.
initAndInsert(ChildrenBinding, model, { key: id, args: [] })
// @ts-expect-error Child initialization retains its numeric argument.
initAndInsert(ChildrenBinding, model, { key: id, args: ['wrong'] })
// @ts-expect-error Child initialization retains its string rest arguments.
initAndInsert(ChildrenBinding, model, { key: id, args: [1, 'label', 2] })
// @ts-expect-error Wrapper metadata remains parent-owned rather than invented.
initAndInsert(RowsBinding, model, { key: id, args: [1] })
// @ts-expect-error Exposed keyed operations retain branded identities.
ChildrenBinding.read('first', { multiplier: 1 })
// @ts-expect-error Connected operations preserve the child's required update context.
ChildrenBinding.read(id)
// @ts-expect-error Generic UI operations preserve the factory's refined payload.
PickerBinding.select('first', { selected: 'Green' })

const MissingComposition = ParentDefinition.makeComposition()
const missingUpdate = MissingComposition.makeUpdate({
  RequestedInsert: model => insert(model, id),
})
// @ts-expect-error Map initialization recipes preserve required registration.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({
    model,
    childInitContext: { seed: 1 },
  })),
  update: missingUpdate,
})
const ForeignBinding = makeMapBinding(ChildBlock, {
  field: 'children',
  placement: 'foreign',
  delivery,
}).withOutMessagePolicy({ fold: () => ParentDefinition.makeNoopStep() })
const ForeignComposition = ParentDefinition.makeComposition({
  bindings: [ForeignBinding],
})
const foreignUpdate = ForeignComposition.makeUpdate({
  RequestedInsert: model => insert(model, id),
})
// @ts-expect-error Registering another placement cannot satisfy the original recipe.
ForeignComposition.prepareBlock({
  init: ForeignComposition.makeInit(() => ({
    model,
    childInitContext: { seed: 1 },
  })),
  update: foreignUpdate,
})

const WrongForwardBinding = ChildrenBinding.withOutMessagePolicy({
  forward: () => ({ _tag: 'Undeclared' }),
})
// @ts-expect-error Composition rejects forwarding outside its parent OutMessage union.
ParentDefinition.makeComposition({ bindings: [WrongForwardBinding] })
