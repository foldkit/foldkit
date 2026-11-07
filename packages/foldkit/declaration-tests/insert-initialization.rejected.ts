import { Array, Effect, HashMap, Option, Record, Schema, Tuple } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { initAndInsert, makeInitIfMissingStep } from 'foldkit/binding'

import {
  ChildBlock,
  ChildrenByIdBinding,
  Id,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  RowsByIdBinding,
  ZeroChildrenByIdBinding,
  firstId,
  initRecordIfMissing,
  insertRecord,
  model,
} from './insert-initialization.accepted.js'

// @ts-expect-error The exact branded Record key is required.
initAndInsert(ChildrenByIdBinding, model, { key: 'first', args: [1] })
// @ts-expect-error The first child init argument is required.
initAndInsert(ChildrenByIdBinding, model, { key: firstId, args: [] })
// @ts-expect-error The required child init argument remains numeric.
initAndInsert(ChildrenByIdBinding, model, { key: firstId, args: ['wrong'] })
initAndInsert(ChildrenByIdBinding, model, {
  key: firstId,
  // @ts-expect-error The child init rest arguments remain strings.
  args: [1, 'valid', 2],
})
initAndInsert(
  ChildrenByIdBinding,
  // @ts-expect-error The complete parent Model is required.
  { childrenById: {} },
  { key: firstId, args: [1] },
)
const commandsConfig = {
  key: firstId,
  args: Tuple.make(1),
  commands: Array.empty(),
}
// @ts-expect-error An aliased config cannot add parent Commands.
initAndInsert(ChildrenByIdBinding, model, commandsConfig)
const writerConfig = {
  key: firstId,
  args: Tuple.make(1),
  toParentModel: () => model,
}
// @ts-expect-error An aliased config cannot provide a parent writer.
initAndInsert(ChildrenByIdBinding, model, writerConfig)
const recipe = insertRecord(model, firstId)
// @ts-expect-error The recipe remains passive and noncallable.
recipe(model)
// @ts-expect-error The recipe does not expose a Model.
recipe.model
// @ts-expect-error The recipe does not expose Commands.
recipe.commands

const MissingComposition = ParentDefinition.makeComposition()
const missingUpdate = MissingComposition.makeUpdate({
  RequestedInsert: model => insertRecord(model, firstId),
})
// @ts-expect-error The helper preserves its required Binding registration.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({ model })),
  update: missingUpdate,
})
const ForeignBinding = ParentDefinition.makeRecordBinding(ChildBlock, {
  field: 'childrenById',
  placement: 'foreign',
}).withOutMessagePolicy({ fold: () => ParentDefinition.makeNoopStep() })
const ForeignComposition = ParentDefinition.makeComposition({
  bindings: [ForeignBinding],
})
const foreignUpdate = ForeignComposition.makeUpdate({
  RequestedInsert: model => insertRecord(model, firstId),
})
// @ts-expect-error A sibling Binding does not satisfy the recipe's registered placement.
ForeignComposition.prepareBlock({
  init: ForeignComposition.makeInit(() => ({ model })),
  update: foreignUpdate,
})
// @ts-expect-error Wrapped map values keep an explicit parent-owned writer.
initAndInsert(RowsByIdBinding, model, { key: firstId, args: [1] })

const OtherModel = Schema.Struct({
  child: ChildBlock.Model,
  maybeChild: Schema.Option(ChildBlock.Model),
  children: Schema.Record(Id, ChildBlock.Model),
  otherChildren: Schema.Record(Id, ChildBlock.Model),
})
const OtherDefinition = Block.makeDefinition('OtherInsertParent', {
  Model: OtherModel,
  Message: ParentMessage,
})
const childModel = ChildBlock.Model.make({ count: 1 })
const otherModel = OtherModel.make({
  child: childModel,
  maybeChild: Option.none(),
  children: {},
  otherChildren: {},
})
const DirectBinding = OtherDefinition.makeRequiredFieldBinding(ChildBlock, {
  field: 'child',
  init: { contextToArgs: () => [1] },
})
// @ts-expect-error Singular child fields do not support map insertion.
initAndInsert(DirectBinding, otherModel, { key: firstId, args: [1] })
const OptionalBinding = OtherDefinition.makeOptionalFieldBinding(ChildBlock, {
  field: 'maybeChild',
})
// @ts-expect-error Option storage does not support map insertion.
initAndInsert(OptionalBinding, otherModel, { key: firstId, args: [1] })
const AccessorBinding = OtherDefinition.makeCustomBinding(ChildBlock, {
  read: model => Option.some(model.child),
  write: (model, child) => Struct.modifyFields(model, { child: () => child }),
})
// @ts-expect-error Custom accessors do not declare direct map storage.
initAndInsert(AccessorBinding, otherModel, { key: firstId, args: [1] })
const GeneralBinding = OtherDefinition.makeCustomKeyedBinding(ChildBlock, {
  readAll: model =>
    Array.map(Record.toEntries(model.children), ([key, child]) => ({
      key,
      child,
    })),
  key: entry => Id.make(entry.key),
  read: entry => entry.child,
  writeAt: model => model,
  keySchema: Id,
})
// @ts-expect-error General keyed accessors do not declare map storage.
initAndInsert(GeneralBinding, otherModel, { key: firstId, args: [1] })
const FirstMapBinding = OtherDefinition.makeRecordBinding(ChildBlock, {
  field: 'children',
})
const SecondMapBinding = OtherDefinition.makeRecordBinding(ChildBlock, {
  field: 'otherChildren',
})
const ambiguousBinding =
  Math.random() > 0.5 ? FirstMapBinding : SecondMapBinding
// @ts-expect-error One concrete Binding determines one map field.
initAndInsert(ambiguousBinding, otherModel, { key: firstId, args: [1] })
declare const erasedBinding: Block.AnyBinding
// @ts-expect-error A broad Binding does not prove direct map storage.
initAndInsert(erasedBinding, otherModel, { key: firstId, args: [1] })

const HashModel = Schema.Struct({
  children: Schema.HashMap(Schema.Int, ChildBlock.Model),
})
const HashDefinition = Block.makeDefinition('HashInsertParent', {
  Model: HashModel,
  Message: Message.defineMessageUnion({}),
})
const HashBinding = HashDefinition.makeHashMapBinding(ChildBlock, {
  field: 'children',
})
const hashModel = HashModel.make({ children: HashMap.empty() })
// @ts-expect-error HashMap key inference preserves the numeric Schema key.
initAndInsert(HashBinding, hashModel, { key: firstId, args: [1] })

const NoMessage = Message.defineMessageUnion({})
const WrongOwner = Block.makeDefinition('WrongInsertOwner', {
  Model: ParentModel,
  Message: NoMessage,
}).makeComposition()
const wrongInit = WrongOwner.makeInit(() => recipe)
// @ts-expect-error A different Composition cannot interpret the recipe.
WrongOwner.prepareBlock({ init: wrongInit, update: WrongOwner.makeUpdate({}) })

// @ts-expect-error The exact branded Record key is required.
makeInitIfMissingStep(ChildrenByIdBinding, { key: 'first', args: [1] })
// @ts-expect-error The first child init argument is required.
makeInitIfMissingStep(ChildrenByIdBinding, { key: firstId, args: [] })
// @ts-expect-error The required child init argument remains numeric.
makeInitIfMissingStep(ChildrenByIdBinding, { key: firstId, args: ['wrong'] })
makeInitIfMissingStep(ChildrenByIdBinding, {
  key: firstId,
  // @ts-expect-error The child init rest arguments remain strings.
  args: [1, 'valid', 2],
})
// @ts-expect-error Parent Commands cannot be appended by this focused helper.
makeInitIfMissingStep(ChildrenByIdBinding, commandsConfig)
// @ts-expect-error The Binding owns the insertion writer.
makeInitIfMissingStep(ChildrenByIdBinding, writerConfig)
// @ts-expect-error Wrapped map values keep an explicit parent-owned writer.
makeInitIfMissingStep(RowsByIdBinding, { key: firstId, args: [1] })
// @ts-expect-error Direct fields do not prove map storage.
makeInitIfMissingStep(DirectBinding, { key: firstId, args: [1] })
// @ts-expect-error Option fields do not prove map storage.
makeInitIfMissingStep(OptionalBinding, { key: firstId, args: [1] })
// @ts-expect-error Custom accessors do not prove map storage.
makeInitIfMissingStep(AccessorBinding, { key: firstId, args: [1] })
// @ts-expect-error General keyed accessors do not prove map storage.
makeInitIfMissingStep(GeneralBinding, { key: firstId, args: [1] })
// @ts-expect-error One concrete Binding determines the key and init tuple.
makeInitIfMissingStep(ambiguousBinding, { key: firstId, args: [1] })
// @ts-expect-error A broad Binding does not prove map storage.
makeInitIfMissingStep(erasedBinding, { key: firstId, args: [1] })
declare const anyBinding: any
// @ts-expect-error Any cannot establish a concrete Binding contract.
makeInitIfMissingStep(anyBinding, { key: firstId, args: [1] })
declare const impossibleBinding: never
// @ts-expect-error Never cannot establish a concrete Binding contract.
makeInitIfMissingStep(impossibleBinding, { key: firstId, args: [1] })
// @ts-expect-error HashMap keys retain the exact numeric Schema key.
makeInitIfMissingStep(HashBinding, { key: firstId, args: [1] })

makeInitIfMissingStep(ChildrenByIdBinding, model => {
  model.label
  // @ts-expect-error The producer receives the complete inferred parent Model.
  model.missingField
  return Option.none()
})
const wrongModelProducer = (_model: typeof OtherModel.Type) => Option.none()
// @ts-expect-error An extracted producer must accept the Binding's parent Model.
makeInitIfMissingStep(ChildrenByIdBinding, wrongModelProducer)
// @ts-expect-error A producer retains the exact branded Record key.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.some({ key: 'first', args: [1] }),
)
// @ts-expect-error A producer retains the required child init argument.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.some({ key: firstId, args: [] }),
)
// @ts-expect-error A producer retains the numeric first child init argument.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.some({ key: firstId, args: ['wrong'] }),
)
// @ts-expect-error A producer retains the string child init rest arguments.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.some({ key: firstId, args: [1, 'valid', 2] }),
)
// @ts-expect-error A producer cannot append parent Commands.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.some({ key: firstId, args: [1], commands: Array.empty() }),
)
// @ts-expect-error A producer cannot provide a parent writer.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.some({ key: firstId, args: [1], toParentModel: () => model }),
)
// @ts-expect-error A producer must return an Option, not a plain config object.
makeInitIfMissingStep(ChildrenByIdBinding, () => ({
  key: firstId,
  args: [1],
}))
// @ts-expect-error A producer cannot defer its config through Promise.
makeInitIfMissingStep(ChildrenByIdBinding, async () =>
  Option.some({ key: firstId, args: [1] }),
)
// @ts-expect-error A producer cannot return an Effect.
makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Effect.succeed(Option.some({ key: firstId, args: [1] })),
)
// @ts-expect-error A numeric HashMap producer retains its exact numeric key.
makeInitIfMissingStep(HashBinding, () =>
  Option.some({ key: firstId, args: [1] }),
)
// @ts-expect-error A zero-argument child producer cannot add init arguments.
makeInitIfMissingStep(ZeroChildrenByIdBinding, () =>
  Option.some({ key: firstId, args: [1] }),
)
const skipInitialization = makeInitIfMissingStep(ChildrenByIdBinding, () =>
  Option.none(),
)
// @ts-expect-error Option.none does not remove the registered graph requirement.
skipInitialization(model)
const missingSkippedInitializationUpdate = MissingComposition.makeUpdate({
  // @ts-expect-error A skipped initialization still requires its registered Binding.
  RequestedInsert: skipInitialization,
})
// @ts-expect-error The missing graph cannot execute a producer that returns None.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({ model })),
  update: missingSkippedInitializationUpdate,
})
const foreignSkippedInitializationUpdate = ForeignComposition.makeUpdate({
  // @ts-expect-error A foreign graph cannot execute a producer that returns None.
  RequestedInsert: skipInitialization,
})
// @ts-expect-error A sibling placement cannot satisfy a skipped initialization.
ForeignComposition.prepareBlock({
  init: ForeignComposition.makeInit(() => ({ model })),
  update: foreignSkippedInitializationUpdate,
})
// @ts-expect-error Applying the Step requires the registered graph, even for an existing key.
const uncheckedInitialization = initRecordIfMissing(model)
// @ts-expect-error The connected result exposes no Model projection.
uncheckedInitialization.model
// @ts-expect-error The connected result exposes no Commands projection.
uncheckedInitialization.commands

const missingInitializationUpdate = MissingComposition.makeUpdate({
  // @ts-expect-error The Step's Model input requires its registered Binding.
  RequestedInsert: initRecordIfMissing,
})
// @ts-expect-error Reuse and initialization both retain the required Binding registration.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({ model })),
  update: missingInitializationUpdate,
})
const foreignInitializationUpdate = ForeignComposition.makeUpdate({
  // @ts-expect-error A foreign graph cannot execute this Step.
  RequestedInsert: initRecordIfMissing,
})
// @ts-expect-error Registering a different placement does not satisfy the Step.
ForeignComposition.prepareBlock({
  init: ForeignComposition.makeInit(() => ({ model })),
  update: foreignInitializationUpdate,
})
