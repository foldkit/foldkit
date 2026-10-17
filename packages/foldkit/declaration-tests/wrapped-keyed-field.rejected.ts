import { Option, Schema } from 'effect'
import { Block, Message } from 'foldkit'

import {
  Choice,
  ChoiceEntry,
  ChoiceId,
  DeclarationWrappedKeyedFieldParent,
  InitializedChoicesBinding,
  ParentMessage,
  PlainChoiceBlock,
  TextBlock,
  choiceOutMessagePolicy,
  firstChoiceId,
  initialize,
  toChoiceMessage,
} from './wrapped-keyed-field.accepted.js'

const OpaqueChoiceEntry = Schema.declare(
  (_input): _input is typeof ChoiceEntry.Type => true,
  { expected: 'opaque choice entry' },
)
const PrimaryChoiceEntry = Schema.Struct({
  _tag: Schema.Literal('Primary'),
  id: ChoiceId,
  choice: Choice.block.Model,
})
const SecondaryChoiceEntry = Schema.Struct({
  _tag: Schema.Literal('Secondary'),
  id: ChoiceId,
  choice: Choice.block.Model,
})
const UnionChoiceEntry = Schema.Union([
  PrimaryChoiceEntry,
  SecondaryChoiceEntry,
])
const IndexChoiceEntry = Schema.StructWithRest(
  Schema.Struct({ id: ChoiceId, choice: Choice.block.Model }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)
const OptionalKeyChoiceEntry = Schema.Struct({
  id: Schema.optionalKey(ChoiceId),
  choice: Choice.block.Model,
})
const MissingKeyChoiceEntry = Schema.Struct({
  choice: Choice.block.Model,
})
const BooleanKeyChoiceEntry = Schema.Struct({
  id: Schema.Boolean,
  choice: Choice.block.Model,
})
const OptionalChildChoiceEntry = Schema.Struct({
  id: ChoiceId,
  choice: Schema.optionalKey(Choice.block.Model),
})
const MissingChildChoiceEntry = Schema.Struct({ id: ChoiceId })
const IncompatibleChildChoiceEntry = Schema.Struct({
  id: ChoiceId,
  choice: Schema.String,
})
const WiderChoiceModel = Schema.Struct({ value: Schema.String })
const WiderChildChoiceEntry = Schema.Struct({
  id: ChoiceId,
  choice: WiderChoiceModel,
})
const NarrowerChoiceModel = Schema.Struct({ value: Schema.Literal('One') })
const NarrowerChildChoiceEntry = Schema.Struct({
  id: ChoiceId,
  choice: NarrowerChoiceModel,
})

const InvalidParentModel = Schema.Struct({
  opaqueChoices: Schema.Array(OpaqueChoiceEntry),
  unionChoices: Schema.Array(UnionChoiceEntry),
  indexChoices: Schema.Array(IndexChoiceEntry),
  optionalChoices: Schema.optionalKey(Schema.Array(ChoiceEntry)),
  optionChoices: Schema.Option(Schema.Array(ChoiceEntry)),
  mapChoices: Schema.HashMap(Schema.String, ChoiceEntry),
  tupleChoices: Schema.Tuple([ChoiceEntry]),
  optionalKeyChoices: Schema.Array(OptionalKeyChoiceEntry),
  missingKeyChoices: Schema.Array(MissingKeyChoiceEntry),
  booleanKeyChoices: Schema.Array(BooleanKeyChoiceEntry),
  optionalChildChoices: Schema.Array(OptionalChildChoiceEntry),
  missingChildChoices: Schema.Array(MissingChildChoiceEntry),
  incompatibleChildChoices: Schema.Array(IncompatibleChildChoiceEntry),
  widerChildChoices: Schema.Array(WiderChildChoiceEntry),
  narrowerChildChoices: Schema.Array(NarrowerChildChoiceEntry),
})
const DeclarationInvalidWrappedKeyedFieldParent = Block.define(
  'DeclarationInvalidWrappedKeyedFieldParent',
  {
    Model: InvalidParentModel,
    Message: ParentMessage,
  },
)

const toIgnoredChoiceMessage = (
  _id: unknown,
  message: typeof Choice.Message.Type,
) => ParentMessage.GotChoiceMessage({ id: firstChoiceId, message })

const idKey: 'id' = 'id'
const choiceChildField: 'choice' = 'choice'
const opaqueChoicesField: 'opaqueChoices' = 'opaqueChoices'
const unionChoicesField: 'unionChoices' = 'unionChoices'
const indexChoicesField: 'indexChoices' = 'indexChoices'
const optionalChoicesField: 'optionalChoices' = 'optionalChoices'
const optionChoicesField: 'optionChoices' = 'optionChoices'
const mapChoicesField: 'mapChoices' = 'mapChoices'
const tupleChoicesField: 'tupleChoices' = 'tupleChoices'
const missingChoicesField: 'missingChoices' = 'missingChoices'
const optionalKeyChoicesField: 'optionalKeyChoices' = 'optionalKeyChoices'
const missingKeyChoicesField: 'missingKeyChoices' = 'missingKeyChoices'
const booleanKeyChoicesField: 'booleanKeyChoices' = 'booleanKeyChoices'
const optionalChildChoicesField: 'optionalChildChoices' = 'optionalChildChoices'
const missingChildChoicesField: 'missingChildChoices' = 'missingChildChoices'
const incompatibleChildChoicesField: 'incompatibleChildChoices' =
  'incompatibleChildChoices'
const widerChildChoicesField: 'widerChildChoices' = 'widerChildChoices'
const narrowerChildChoicesField: 'narrowerChildChoices' = 'narrowerChildChoices'
const plainChoicesField: 'plainChoices' = 'plainChoices'

const opaqueConfig = {
  field: opaqueChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a Struct item schema.
  opaqueConfig,
)

const unionConfig = {
  field: unionChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand does not accept union item schemas.
  unionConfig,
)

const indexConfig = {
  field: indexChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a closed Struct item schema.
  indexConfig,
)

const optionalCollectionConfig = {
  field: optionalChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection field must be required.
  optionalCollectionConfig,
)

const optionCollectionConfig = {
  field: optionChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection must be an Array, not an Option.
  optionCollectionConfig,
)

const mapCollectionConfig = {
  field: mapChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection must be an Array, not a HashMap.
  mapCollectionConfig,
)

const tupleCollectionConfig = {
  field: tupleChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection must be an Array, not a tuple.
  tupleCollectionConfig,
)

const missingCollectionConfig = {
  field: missingChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires an existing parent field.
  missingCollectionConfig,
)

const optionalKeyConfig = {
  field: optionalKeyChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toIgnoredChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The wrapper key field must be required.
  optionalKeyConfig,
)

const missingKeyConfig = {
  field: missingKeyChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toIgnoredChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The key must name a wrapper field.
  missingKeyConfig,
)

const booleanKeyConfig = {
  field: booleanKeyChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toIgnoredChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapper occurrence keys must be strings or numbers.
  booleanKeyConfig,
)

const optionalChildConfig = {
  field: optionalChildChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The wrapper child field must be required.
  optionalChildConfig,
)

const missingChildConfig = {
  field: missingChildChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The child field must name a wrapper field.
  missingChildConfig,
)

const incompatibleChildConfig = {
  field: incompatibleChildChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The wrapper child field must store the exact child Model.
  incompatibleChildConfig,
)

const widerChildConfig = {
  field: widerChildChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error A wider wrapper child field is not exact storage.
  widerChildConfig,
)

const narrowerChildConfig = {
  field: narrowerChildChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationInvalidWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error A narrower wrapper child field cannot store every transition.
  narrowerChildConfig,
)

const missingKeySelectorConfig = {
  field: plainChoicesField,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a key field.
  missingKeySelectorConfig,
)

const missingChildSelectorConfig = {
  field: plainChoicesField,
  key: idKey,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a child field.
  missingChildSelectorConfig,
)

const selectParentField =
  (): keyof typeof DeclarationWrappedKeyedFieldParent.Model.Type =>
    'plainChoices'
const dynamicFieldConfig = {
  field: selectParentField(),
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires one literal parent field.
  dynamicFieldConfig,
)

const selectEntryField = (): keyof typeof ChoiceEntry.Type => 'id'
const dynamicKeyConfig = {
  field: plainChoicesField,
  key: selectEntryField(),
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
// @ts-expect-error Wrapped keyed shorthand requires one literal key field.
DeclarationWrappedKeyedFieldParent.bindChild(PlainChoiceBlock, dynamicKeyConfig)

const dynamicChildConfig = {
  field: plainChoicesField,
  key: idKey,
  childField: selectEntryField(),
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires one literal child field.
  dynamicChildConfig,
)

const readAllConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  readAll: (model: typeof DeclarationWrappedKeyedFieldParent.Model.Type) =>
    model.plainChoices,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
// @ts-expect-error Field shorthand cannot also provide readAll.
DeclarationWrappedKeyedFieldParent.bindChild(PlainChoiceBlock, readAllConflict)

const readConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  read: (entry: typeof ChoiceEntry.Type) => entry.choice,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
// @ts-expect-error Field shorthand cannot also provide a custom reader.
DeclarationWrappedKeyedFieldParent.bindChild(PlainChoiceBlock, readConflict)

const writeConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  write: (model: typeof DeclarationWrappedKeyedFieldParent.Model.Type) => model,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
// @ts-expect-error Field shorthand cannot also provide a static writer.
DeclarationWrappedKeyedFieldParent.bindChild(PlainChoiceBlock, writeConflict)

const writeAtConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  writeAt: (
    model: typeof DeclarationWrappedKeyedFieldParent.Model.Type,
    _id: typeof ChoiceId.Type,
    _nextChoice: typeof Choice.block.Model.Type,
  ) => model,
  fromParentMessage: false satisfies false,
  toParentMessage: toChoiceMessage,
}
// @ts-expect-error Field shorthand cannot also provide a keyed writer.
DeclarationWrappedKeyedFieldParent.bindChild(PlainChoiceBlock, writeAtConflict)

const WrongChildMessage = Message.defineMessageUnion({ WrongMessage: {} })
const wrongChildMapping = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: (
    id: typeof ChoiceId.Type,
    _message: typeof WrongChildMessage.Type,
  ) =>
    ParentMessage.GotChoiceMessage({
      id,
      message: Choice.Message.CompletedRefresh(),
    }),
}
DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The mapper must accept the bound child's Message type.
  wrongChildMapping,
)

const ForeignParentMessage = Message.defineMessageUnion({
  GotChoiceMessage: { message: Choice.Message },
})
const wrongParentMapping = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: false satisfies false,
  toParentMessage: (
    _id: typeof ChoiceId.Type,
    message: typeof Choice.Message.Type,
  ) => ForeignParentMessage.GotChoiceMessage({ message }),
}
DeclarationWrappedKeyedFieldParent.bindChild(
  PlainChoiceBlock,
  // @ts-expect-error The mapper must return the owning parent's Message type.
  wrongParentMapping,
)

const SameFieldEntry = Schema.Struct({ value: Schema.String })
const SameFieldParentModel = Schema.Struct({
  values: Schema.Array(SameFieldEntry),
})
const DeclarationSameWrappedFieldParent = Block.define(
  'DeclarationSameWrappedFieldParent',
  {
    Model: SameFieldParentModel,
    Message: ParentMessage,
  },
)
const valuesField: 'values' = 'values'
const valueField: 'value' = 'value'
const sameFieldConfig = {
  field: valuesField,
  key: valueField,
  childField: valueField,
  fromParentMessage: false satisfies false,
  toParentMessage: (id: string, message: typeof TextBlock.Message.Type) =>
    ParentMessage.GotTextMessage({ id, message }),
}
// @ts-expect-error The wrapper key and child fields must be different fields.
DeclarationSameWrappedFieldParent.bindChild(TextBlock, sameFieldConfig)

// @ts-expect-error Wrapped occurrence arguments must match the child init tuple.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: choiceOutMessagePolicy, init: { occurrences: () => [{ key: firstChoiceId, args: [1] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } })

// @ts-expect-error Wrapped toItem must return the exact parent collection item.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: choiceOutMessagePolicy, init: { occurrences: () => [{ key: firstChoiceId, args: ['One'] }], toItem: (_occurrence, choice) => choice } })

// @ts-expect-error Wrapped occurrence resolver context cannot be never.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: choiceOutMessagePolicy, init: { occurrences: (_context: never) => [{ key: firstChoiceId, args: ['One'] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } })

const DuplicateInitializedChoicesBinding =
  DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    placement: 'duplicateInitializedChoices',
    toParentMessage: toChoiceMessage,
    fromParentMessage: {
      parentMessage: ParentMessage.GotChoiceMessage,
      args: (_model, { id, message }) => Option.some([id, message]),
    },
    outMessage: choiceOutMessagePolicy,
    init: {
      occurrences: () => [{ key: firstChoiceId, args: ['One'] }],
      toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }),
    },
  })
// @ts-expect-error Initialized child fields must be unique across the graph.
DeclarationWrappedKeyedFieldParent.makeComposition({
  childBindings: [
    InitializedChoicesBinding,
    DuplicateInitializedChoicesBinding,
  ],
})

const UnregisteredComposition =
  DeclarationWrappedKeyedFieldParent.makeComposition()
UnregisteredComposition.makeBlock({
  init: initialize,
  update: UnregisteredComposition.makeUpdate(model => ({ model })),
  // @ts-expect-error An initializer retains registration evidence for its initialized child graph.
  EffectsLayer: Choice.ReadChoice.layer,
})

// @ts-expect-error Wrapped occurrence arguments preserve the child initializer's literal domain.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: choiceOutMessagePolicy, init: { occurrences: () => [{ key: firstChoiceId, args: ['Three'] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } })

// @ts-expect-error Wrapped occurrence arguments preserve the child initializer's tuple arity.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: choiceOutMessagePolicy, init: { occurrences: () => [{ key: firstChoiceId, args: ['One', 'Two'] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } })

// @ts-expect-error Extracted keyed policies must accept every key in the collection.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { readAll: model => model.choices, key: item => item.id, read: item => item.choice, writeAt: model => model, toParentMessage: (id, message) => ParentMessage.GotChoiceMessage({ id, message }), fromParentMessage: false, outMessage: { fold: (_key: 'other', _outMessage: typeof Choice.OutMessage.Type) => DeclarationWrappedKeyedFieldParent.step(model => ({ model })) } })

// @ts-expect-error Extracted keyed policies must accept every refined OutMessage payload.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { readAll: model => model.choices, key: item => item.id, read: item => item.choice, writeAt: model => model, toParentMessage: (id, message) => ParentMessage.GotChoiceMessage({ id, message }), fromParentMessage: false, outMessage: { fold: (_key: typeof ChoiceId.Type, _outMessage: Readonly<{ _tag: 'SelectedValue'; value: 'One' }>) => DeclarationWrappedKeyedFieldParent.step(model => ({ model })) } })

// @ts-expect-error Wrapped keyed policies must accept every collection key.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { field: 'choices', key: 'id', childField: 'choice', toParentMessage: toChoiceMessage, fromParentMessage: false, outMessage: { fold: (_key: 'other', _outMessage: typeof Choice.OutMessage.Type) => DeclarationWrappedKeyedFieldParent.step(model => ({ model })) } })

const wrongModelPolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (_model: typeof DeclarationWrappedKeyedFieldParent.Model.Type) => ({
      model: Choice.block.Model.make({ value: 'One' }),
    }),
}
// oxfmt-ignore
const WrongModelPolicyBinding = DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { readAll: model => model.choices, key: item => item.id, read: item => item.choice, writeAt: model => model, toParentMessage: (id, message) => ParentMessage.GotChoiceMessage({ id, message }), fromParentMessage: false, outMessage: wrongModelPolicy })
// @ts-expect-error An extracted keyed policy Step must return the parent Model.
DeclarationWrappedKeyedFieldParent.makeComposition({
  childBindings: [WrongModelPolicyBinding],
})

const foreignMessagePolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (model: typeof DeclarationWrappedKeyedFieldParent.Model.Type) => ({
      model,
      commands: [Choice.ReadChoice()],
    }),
}
// oxfmt-ignore
const ForeignMessagePolicyBinding = DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { readAll: model => model.choices, key: item => item.id, read: item => item.choice, writeAt: model => model, toParentMessage: (id, message) => ParentMessage.GotChoiceMessage({ id, message }), fromParentMessage: false, outMessage: foreignMessagePolicy })
// @ts-expect-error An extracted keyed policy Command must produce a parent Message.
DeclarationWrappedKeyedFieldParent.makeComposition({
  childBindings: [ForeignMessagePolicyBinding],
})

const undeclaredOutMessagePolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (model: typeof DeclarationWrappedKeyedFieldParent.Model.Type) => ({
      model,
      outMessage: Choice.OutMessage.SelectedValue({ value: 'One' }),
    }),
}
// oxfmt-ignore
const UndeclaredOutMessagePolicyBinding = DeclarationWrappedKeyedFieldParent.bindChild(Choice.block, { readAll: model => model.choices, key: item => item.id, read: item => item.choice, writeAt: model => model, toParentMessage: (id, message) => ParentMessage.GotChoiceMessage({ id, message }), fromParentMessage: false, outMessage: undeclaredOutMessagePolicy })
// @ts-expect-error An extracted keyed policy cannot emit an undeclared parent OutMessage.
DeclarationWrappedKeyedFieldParent.makeComposition({
  childBindings: [UndeclaredOutMessagePolicyBinding],
})
