import { Array, Option, Schema, Tuple } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { initAndAppend } from 'foldkit/bindingInit'
import { makeMapBinding } from 'foldkit/mapBinding'

import {
  ChildBlock,
  EntriesBinding,
  Entry,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  append,
  firstId,
  model,
} from './append-initialization.accepted.js'

// @ts-expect-error The exact branded occurrence key is required.
initAndAppend(EntriesBinding, model, { key: 'first', args: [1] })
// @ts-expect-error The first child init argument is required.
initAndAppend(EntriesBinding, model, { key: firstId, args: [] })
// @ts-expect-error The required child init argument remains numeric.
initAndAppend(EntriesBinding, model, { key: firstId, args: ['wrong'] })
// @ts-expect-error The child init rest arguments remain strings.
initAndAppend(EntriesBinding, model, { key: firstId, args: [1, 'valid', 2] })
// @ts-expect-error The complete parent Model is required.
initAndAppend(EntriesBinding, { entries: [] }, { key: firstId, args: [1] })
const commandsConfig = {
  key: firstId,
  args: Tuple.make(1),
  commands: Array.empty(),
}
// @ts-expect-error An aliased config cannot add parent Commands.
initAndAppend(EntriesBinding, model, commandsConfig)
const writerConfig = {
  key: firstId,
  args: Tuple.make(1),
  toParentModel: () => model,
}
// @ts-expect-error An aliased config cannot provide a parent writer.
initAndAppend(EntriesBinding, model, writerConfig)
const recipe = append(model, firstId)
// @ts-expect-error The recipe remains passive and noncallable.
recipe(model)
// @ts-expect-error The recipe does not expose a Model.
recipe.model
// @ts-expect-error The recipe does not expose Commands.
recipe.commands

const MissingComposition = ParentDefinition.makeComposition()
const missingUpdate = MissingComposition.makeUpdate({
  RequestedAppend: model => append(model, firstId),
})
// @ts-expect-error The helper preserves its required Binding registration.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({ model })),
  update: missingUpdate,
})
const ForeignBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'foreign',
  field: 'entries',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child, label: 'foreign' }),
  },
}).withOutMessagePolicy({ fold: () => ParentDefinition.makeNoopStep() })
const ForeignComposition = ParentDefinition.makeComposition({
  bindings: [ForeignBinding],
})
const foreignUpdate = ForeignComposition.makeUpdate({
  RequestedAppend: model => append(model, firstId),
})
// @ts-expect-error A sibling Binding does not satisfy the recipe's registered placement.
ForeignComposition.prepareBlock({
  init: ForeignComposition.makeInit(() => ({ model: { label: 'foreign' } })),
  update: foreignUpdate,
})
const UninitializedBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
})
// @ts-expect-error Dynamic append requires the existing startup toItem policy.
initAndAppend(UninitializedBinding, model, { key: firstId, args: [1] })
const maybeBinding = Math.random() > 0.5 ? EntriesBinding : ForeignBinding
// @ts-expect-error One concrete Binding determines one placement and field.
initAndAppend(maybeBinding, model, { key: firstId, args: [1] })

const OtherModel = Schema.Struct({
  child: ChildBlock.Model,
  maybeChild: Schema.Option(ChildBlock.Model),
  maybeEntry: Schema.Option(Entry),
  entries: Schema.Array(Entry),
  otherEntries: Schema.Array(Entry),
  mapped: Schema.Record(Schema.String, ChildBlock.Model),
})
const OtherDefinition = Block.makeDefinition('OtherAppendParent', {
  Model: OtherModel,
  Message: ParentMessage,
})
const childModel = ChildBlock.Model.make({ count: 1, labels: [] })
const otherModel = OtherModel.make({
  child: childModel,
  maybeChild: Option.none(),
  maybeEntry: Option.none(),
  entries: [],
  otherEntries: [],
  mapped: {},
})
const DirectBinding = OtherDefinition.makeBinding(ChildBlock, {
  field: 'child',
  init: { contextToArgs: () => [1] },
})
// @ts-expect-error Direct child fields do not support append.
initAndAppend(DirectBinding, otherModel, { key: firstId, args: [1] })
const OptionalBinding = OtherDefinition.makeBinding(ChildBlock, {
  field: 'maybeChild',
})
// @ts-expect-error Optional direct storage does not support append.
initAndAppend(OptionalBinding, otherModel, { key: firstId, args: [1] })
const OptionalEntryBinding = OtherDefinition.makeBinding(ChildBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
})
// @ts-expect-error Wrapped Option storage cannot be appended to.
initAndAppend(OptionalEntryBinding, otherModel, { key: firstId, args: [1] })
const AccessorBinding = OtherDefinition.makeBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, child) => Struct.modifyFields(model, { child: () => child }),
  init: { contextToArgs: () => [1], toParentFields: child => ({ child }) },
})
// @ts-expect-error Accessor projection does not authorize array insertion.
initAndAppend(AccessorBinding, otherModel, { key: firstId, args: [1] })
const GeneralBinding = OtherDefinition.makeBinding(ChildBlock, {
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  keySchema: Entry.fields.id,
})
// @ts-expect-error General keyed accessors do not declare a stored insertion policy.
initAndAppend(GeneralBinding, otherModel, { key: firstId, args: [1] })
const MapBinding = makeMapBinding(OtherDefinition, ChildBlock, {
  field: 'mapped',
})
// @ts-expect-error Map storage has no array append policy.
initAndAppend(MapBinding, otherModel, { key: firstId, args: [1] })

const FirstArrayBinding = OtherDefinition.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child, label: 'first' }),
  },
})
const SecondArrayBinding = OtherDefinition.makeBinding(ChildBlock, {
  field: 'otherEntries',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child, label: 'second' }),
  },
})
const ambiguousFieldBinding =
  Math.random() > 0.5 ? FirstArrayBinding : SecondArrayBinding
// @ts-expect-error A shared placement does not make a union of storage fields unambiguous.
initAndAppend(ambiguousFieldBinding, otherModel, { key: firstId, args: [1] })

const NoMessage = Message.defineMessageUnion({})
const WrongOwner = Block.makeDefinition('WrongAppendOwner', {
  Model: ParentModel,
  Message: NoMessage,
}).makeComposition()
const wrongInit = WrongOwner.makeInit(() => recipe)
// @ts-expect-error A different Composition cannot interpret the recipe.
WrongOwner.prepareBlock({ init: wrongInit, update: WrongOwner.makeUpdate({}) })
