import { Schema } from 'effect'
import { Block } from 'foldkit'

import {
  Choice,
  ChoiceEntry,
  ChoiceId,
  DeclarationWrappedKeyedFieldParentDefinition,
  InitializedChoicesBinding,
  LiteralChoicesBinding,
  ParentMessage,
  PlainChoiceBlock,
  PlainChoicesBinding,
  TextBlock,
  TextEntriesBinding,
  choiceOutMessagePolicy,
  firstChoiceId,
  initialize,
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
const DeclarationInvalidWrappedKeyedFieldParentDefinition =
  Block.makeDefinition('DeclarationInvalidWrappedKeyedFieldParent', {
    Model: InvalidParentModel,
    Message: ParentMessage,
  })

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
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a Struct item schema.
  opaqueConfig,
)

const unionConfig = {
  field: unionChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand does not accept union item schemas.
  unionConfig,
)

const indexConfig = {
  field: indexChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a closed Struct item schema.
  indexConfig,
)

const optionalCollectionConfig = {
  field: optionalChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection field must be required.
  optionalCollectionConfig,
)

const optionCollectionConfig = {
  field: optionChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection must be an Array, not an Option.
  optionCollectionConfig,
)

const mapCollectionConfig = {
  field: mapChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection must be an Array, not a HashMap.
  mapCollectionConfig,
)

const tupleCollectionConfig = {
  field: tupleChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The parent collection must be an Array, not a tuple.
  tupleCollectionConfig,
)

const missingCollectionConfig = {
  field: missingChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires an existing parent field.
  missingCollectionConfig,
)

const optionalKeyConfig = {
  field: optionalKeyChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The wrapper key field must be required.
  optionalKeyConfig,
)

const missingKeyConfig = {
  field: missingKeyChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The key must name a wrapper field.
  missingKeyConfig,
)

const booleanKeyConfig = {
  field: booleanKeyChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapper occurrence keys must be strings or numbers.
  booleanKeyConfig,
)

const optionalChildConfig = {
  field: optionalChildChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The wrapper child field must be required.
  optionalChildConfig,
)

const missingChildConfig = {
  field: missingChildChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The child field must name a wrapper field.
  missingChildConfig,
)

const incompatibleChildConfig = {
  field: incompatibleChildChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error The wrapper child field must store the exact child Model.
  incompatibleChildConfig,
)

const widerChildConfig = {
  field: widerChildChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error A wider wrapper child field is not exact storage.
  widerChildConfig,
)

const narrowerChildConfig = {
  field: narrowerChildChoicesField,
  key: idKey,
  childField: choiceChildField,
}
DeclarationInvalidWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error A narrower wrapper child field cannot store every transition.
  narrowerChildConfig,
)

const missingKeySelectorConfig = {
  field: plainChoicesField,
  childField: choiceChildField,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a key field.
  missingKeySelectorConfig,
)

const missingChildSelectorConfig = {
  field: plainChoicesField,
  key: idKey,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires a child field.
  missingChildSelectorConfig,
)

const selectParentField =
  (): keyof typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type =>
    'plainChoices'
const dynamicFieldConfig = {
  field: selectParentField(),
  key: idKey,
  childField: choiceChildField,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires one literal parent field.
  dynamicFieldConfig,
)

const selectEntryField = (): keyof typeof ChoiceEntry.Type => 'id'
const dynamicKeyConfig = {
  field: plainChoicesField,
  key: selectEntryField(),
  childField: choiceChildField,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires one literal key field.
  dynamicKeyConfig,
)

const dynamicChildConfig = {
  field: plainChoicesField,
  key: idKey,
  childField: selectEntryField(),
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Wrapped keyed shorthand requires one literal child field.
  dynamicChildConfig,
)

const readAllConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  readAll: (
    model: typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type,
  ) => model.plainChoices,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Field shorthand cannot also provide readAll.
  readAllConflict,
)

const readConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  read: (entry: typeof ChoiceEntry.Type) => entry.choice,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Field shorthand cannot also provide a custom reader.
  readConflict,
)

const writeConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  write: (
    model: typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type,
  ) => model,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Field shorthand cannot also provide a static writer.
  writeConflict,
)

const writeAtConflict = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  writeAt: (
    model: typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type,
    _id: typeof ChoiceId.Type,
    _nextChoice: typeof Choice.block.Model.Type,
  ) => model,
}
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  // @ts-expect-error Field shorthand cannot also provide a keyed writer.
  writeAtConflict,
)

const wrongChildMapping = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  toParentMessage: () => ParentMessage.IgnoredChildMessage(),
}
// @ts-expect-error Generated wrapped delivery does not accept an authored outgoing mapper.
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  wrongChildMapping,
)

const wrongParentMapping = {
  field: plainChoicesField,
  key: idKey,
  childField: choiceChildField,
  fromParentMessage: {},
}
// @ts-expect-error Generated wrapped delivery does not accept an authored incoming mapper.
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(
  PlainChoiceBlock,
  wrongParentMapping,
)

const SameFieldEntry = Schema.Struct({ value: Schema.String })
const SameFieldParentModel = Schema.Struct({
  values: Schema.Array(SameFieldEntry),
})
const DeclarationSameWrappedFieldParentDefinition = Block.makeDefinition(
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
}
DeclarationSameWrappedFieldParentDefinition.makeBinding(
  TextBlock,
  // @ts-expect-error The wrapper key and child fields must be different fields.
  sameFieldConfig,
)

// @ts-expect-error Wrapped occurrence arguments must match the child init tuple.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', init: { instances: () => [{ key: firstChoiceId, args: [1] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } }).withOutMessagePolicy(choiceOutMessagePolicy)

// @ts-expect-error Wrapped toItem must return the exact parent collection item.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', init: { instances: () => [{ key: firstChoiceId, args: ['One'] }], toItem: (_occurrence, choice) => choice } }).withOutMessagePolicy(choiceOutMessagePolicy)

// @ts-expect-error Wrapped occurrence resolver context cannot be never.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', init: { instances: (_context: never) => [{ key: firstChoiceId, args: ['One'] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } }).withOutMessagePolicy(choiceOutMessagePolicy)

const DuplicateInitializedChoicesBinding =
  DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, {
    field: 'choices',
    key: 'id',
    childField: 'choice',
    placement: 'duplicateInitializedChoices',
    init: {
      instances: () => [{ key: firstChoiceId, args: ['One'] }],
      toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }),
    },
  }).withOutMessagePolicy(choiceOutMessagePolicy)
// @ts-expect-error Initialized child fields must be unique across the graph.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [
    InitializedChoicesBinding,
    DuplicateInitializedChoicesBinding,
    LiteralChoicesBinding,
    TextEntriesBinding,
  ],
})

const UnregisteredComposition =
  DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
    bindings: [PlainChoicesBinding, LiteralChoicesBinding, TextEntriesBinding],
  })
UnregisteredComposition.prepareBlock({
  // @ts-expect-error An initializer retains registration evidence for its initialized child graph.
  init: initialize,
  update: UnregisteredComposition.makeUpdate({
    IgnoredChildMessage: model => ({ model }),
  }),
  EffectsLayer: Choice.ReadChoice.layer,
})

// @ts-expect-error Wrapped occurrence arguments preserve the child initializer's literal domain.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', init: { instances: () => [{ key: firstChoiceId, args: ['Three'] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } }).withOutMessagePolicy(choiceOutMessagePolicy)

// @ts-expect-error Wrapped occurrence arguments preserve the child initializer's tuple arity.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', init: { instances: () => [{ key: firstChoiceId, args: ['One', 'Two'] }], toItem: ({ key }, choice) => ChoiceEntry.make({ id: key, choice }) } }).withOutMessagePolicy(choiceOutMessagePolicy)

// @ts-expect-error Extracted keyed policies must accept every key in the collection.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { readAll: model => model.choices, key: item => item.id, keySchema: ChoiceEntry.fields.id, read: item => item.choice, writeAt: model => model, }).withOutMessagePolicy({ fold: (_key: 'other', _outMessage: typeof Choice.OutMessage.Type) => DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({ model })) })

// @ts-expect-error Extracted keyed policies must accept every refined OutMessage payload.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { readAll: model => model.choices, key: item => item.id, keySchema: ChoiceEntry.fields.id, read: item => item.choice, writeAt: model => model, }).withOutMessagePolicy({ fold: (_key: typeof ChoiceId.Type, _outMessage: Readonly<{ _tag: 'SelectedValue'; value: 'One' }>) => DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({ model })) })

// @ts-expect-error Wrapped keyed policies must accept every collection key.
// oxfmt-ignore
DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { field: 'choices', key: 'id', childField: 'choice', }).withOutMessagePolicy({ fold: (_key: 'other', _outMessage: typeof Choice.OutMessage.Type) => DeclarationWrappedKeyedFieldParentDefinition.makeStep(model => ({ model })) })

const wrongModelPolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (
      _model: typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type,
    ) => ({
      model: Choice.block.Model.make({ value: 'One' }),
    }),
}
// oxfmt-ignore
const WrongModelPolicyBinding = DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { readAll: model => model.choices, key: item => item.id, keySchema: ChoiceEntry.fields.id, read: item => item.choice, writeAt: model => model, }).withOutMessagePolicy(wrongModelPolicy)
// @ts-expect-error An extracted keyed policy Step must return the parent Model.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [
    WrongModelPolicyBinding,
    LiteralChoicesBinding,
    TextEntriesBinding,
  ],
})

const foreignMessagePolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (
      model: typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type,
    ) => ({
      model,
      commands: [Choice.ReadChoice()],
    }),
}
// oxfmt-ignore
const ForeignMessagePolicyBinding = DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { readAll: model => model.choices, key: item => item.id, keySchema: ChoiceEntry.fields.id, read: item => item.choice, writeAt: model => model, }).withOutMessagePolicy(foreignMessagePolicy)
// @ts-expect-error An extracted keyed policy Command must produce a parent Message.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [
    ForeignMessagePolicyBinding,
    LiteralChoicesBinding,
    TextEntriesBinding,
  ],
})

const undeclaredOutMessagePolicy = {
  fold:
    (_key: typeof ChoiceId.Type, _outMessage: typeof Choice.OutMessage.Type) =>
    (
      model: typeof DeclarationWrappedKeyedFieldParentDefinition.Model.Type,
    ) => ({
      model,
      outMessage: Choice.OutMessage.SelectedValue({ value: 'One' }),
    }),
}
// oxfmt-ignore
const UndeclaredOutMessagePolicyBinding = DeclarationWrappedKeyedFieldParentDefinition.makeBinding(Choice.block, { readAll: model => model.choices, key: item => item.id, keySchema: ChoiceEntry.fields.id, read: item => item.choice, writeAt: model => model, }).withOutMessagePolicy(undeclaredOutMessagePolicy)
// @ts-expect-error An extracted keyed policy cannot emit an undeclared parent OutMessage.
DeclarationWrappedKeyedFieldParentDefinition.makeComposition({
  bindings: [
    UndeclaredOutMessagePolicyBinding,
    LiteralChoicesBinding,
    TextEntriesBinding,
  ],
})
