import {
  type DateTime,
  type Inspectable,
  Layer,
  Option,
  type Pipeable,
  Schema,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { makeNamespace } from '../block/define.js'
import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Mount from '../mount/index.js'
import type { ChildAttribute, Html, HtmlBuilder } from './index.js'
import type {
  InvalidViewInputsDiagnostic,
  ValidViewInputs,
} from './viewInputs.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Expect<Value extends true> = Value

type NestedRecordCallbacks = Readonly<{
  config: Readonly<{ onSubmit: () => unknown }>
}>

type NestedArrayCallbacks = Readonly<{
  rows: ReadonlyArray<Readonly<{ id: string; onSubmit: () => unknown }>>
}>

type TopLevelArrayCallbacks = ReadonlyArray<
  Readonly<{ id: string; onSubmit: () => unknown }>
>

type NestedOptionCallbacks = Readonly<{
  maybeConfig: Option.Option<Readonly<{ onSubmit: () => unknown }>>
}>

type NestedOptionalCallbacks = Readonly<{
  config: Readonly<{ onSubmit?: () => unknown }>
}>

type NestedTupleCallbacks = Readonly<{
  rows: readonly [
    Readonly<{ id: string }>,
    Readonly<{ onSubmit: () => unknown }>,
  ]
}>

type NestedUnionCallbacks = Readonly<{
  config: Readonly<{ label: string }> | Readonly<{ onSubmit: () => unknown }>
}>

type TopLevelUnionCallbacks =
  | Readonly<{ label: string }>
  | Readonly<{ config: Readonly<{ onSubmit: () => unknown }> }>

type PartialVNodeLikeCallbacks = Readonly<{
  content: Readonly<{
    id: string
    key: string
    data: Readonly<{ onSubmit: () => unknown }>
  }>
}>

type PipeableCallbacks = Readonly<{
  config: Pipeable.Pipeable & Readonly<{ onSubmit: () => unknown }>
}>

type RecursiveNode = Readonly<{
  id: string
  children: ReadonlyArray<RecursiveNode>
}>

type RecursiveUnionCallbacks = Readonly<{
  id: string
  next?: RecursiveUnionCallbacks
  branch: RecursiveUnionCallbacks | Readonly<{ onSubmit: () => unknown }>
}>

type DateBearingInputs = Readonly<{
  report: Readonly<{
    createdAt: Date
    timeline: ReadonlyArray<Readonly<{ at: Date }>>
    maybeExpiresAt: Option.Option<Date>
    range: readonly [Date, Date]
    byId: Readonly<Record<string, Readonly<{ at: Date }>>>
  }>
}>

type DateWithCallback = Date & Readonly<{ onSubmit: () => unknown }>

type EffectDateTimeInputs = Readonly<{
  utc: DateTime.Utc
  zoned: DateTime.Zoned
  timeZone: DateTime.TimeZone
  namedTimeZone: DateTime.TimeZone.Named
  history: ReadonlyArray<Readonly<{ at: DateTime.Utc }>>
  maybeDeadline: Option.Option<DateTime.Zoned>
}>

type InspectableWithCallback = Inspectable.Inspectable &
  Readonly<{ onSubmit: () => unknown }>

type DateTimeWithCallback = DateTime.Utc & Readonly<{ onSubmit: () => unknown }>

type DateTimeOrCallback = DateTime.Utc | Readonly<{ onSubmit: () => unknown }>

type DateTimeCallbacksInArray = ReadonlyArray<DateTimeWithCallback>

type DateTimeCallbacksInOption = Option.Option<DateTimeWithCallback>

type PreservesDateBearingInputs = Expect<
  Equal<ValidViewInputs<DateBearingInputs>, DateBearingInputs>
>
type PreservesEffectDateTimeInputs = Expect<
  Equal<ValidViewInputs<EffectDateTimeInputs>, EffectDateTimeInputs>
>
type RejectsDateWithCallback = Expect<
  Equal<ValidViewInputs<Readonly<{ createdAt: DateWithCallback }>>, never>
>
type RejectsInspectableWithCallback = Expect<
  Equal<ValidViewInputs<Readonly<{ value: InspectableWithCallback }>>, never>
>
type RejectsDateTimeWithCallback = Expect<
  Equal<ValidViewInputs<Readonly<{ value: DateTimeWithCallback }>>, never>
>
type RejectsDateTimeOrCallback = Expect<
  Equal<ValidViewInputs<Readonly<{ value: DateTimeOrCallback }>>, never>
>
type RejectsDateTimeCallbacksInArray = Expect<
  Equal<ValidViewInputs<Readonly<{ values: DateTimeCallbacksInArray }>>, never>
>
type RejectsDateTimeCallbacksInOption = Expect<
  Equal<
    ValidViewInputs<Readonly<{ maybeValue: DateTimeCallbacksInOption }>>,
    never
  >
>
type IdentifiesDateTimeCallbackPath = Expect<
  Equal<
    keyof InvalidViewInputsDiagnostic<
      Readonly<{ value: DateTimeWithCallback }>
    >,
    'Nested callback at viewInputs.value.onSubmit: move it to a top-level ViewInputs field'
  >
>
type IdentifiesDateTimeArrayCallbackPath = Expect<
  Equal<
    keyof InvalidViewInputsDiagnostic<
      Readonly<{ values: DateTimeCallbacksInArray }>
    >,
    'Nested callback at viewInputs.values[number].onSubmit: move it to a top-level ViewInputs field'
  >
>
type IdentifiesDateTimeOptionCallbackPath = Expect<
  Equal<
    keyof InvalidViewInputsDiagnostic<
      Readonly<{ maybeValue: DateTimeCallbacksInOption }>
    >,
    'Nested callback at viewInputs.maybeValue.value.onSubmit: move it to a top-level ViewInputs field'
  >
>
type IdentifiesNestedCallbackPath = Expect<
  Equal<
    keyof InvalidViewInputsDiagnostic<NestedArrayCallbacks>,
    'Nested callback at viewInputs.rows[number].onSubmit: move it to a top-level ViewInputs field'
  >
>

type OmitsOptionalTopLevelCallbackPath = Expect<
  Equal<
    keyof InvalidViewInputsDiagnostic<
      Readonly<{
        onClose?: () => void
        config: Readonly<{ onSubmit: () => void }>
      }>
    >,
    'Nested callback at viewInputs.config.onSubmit: move it to a top-level ViewInputs field'
  >
>

class SchemaBackedItem extends Schema.Class<SchemaBackedItem>(
  'SchemaBackedItem',
)({
  id: Schema.String,
}) {}

type AcceptedViewInputs = Readonly<{
  toView: (
    value: Readonly<{ nestedCallback: () => unknown }>,
  ) => Readonly<{ nestedCallback: () => unknown }>
  content: Html
  attributes: ReadonlyArray<ChildAttribute>
  maybeLabel: Option.Option<Readonly<{ label: string }>>
  item: SchemaBackedItem
  recursive: RecursiveNode
}>

type RejectsNestedRecordCallbacks = Expect<
  Equal<ValidViewInputs<NestedRecordCallbacks>, never>
>
type RejectsNestedArrayCallbacks = Expect<
  Equal<ValidViewInputs<NestedArrayCallbacks>, never>
>
type RejectsTopLevelArrayCallbacks = Expect<
  Equal<ValidViewInputs<TopLevelArrayCallbacks>, never>
>
type RejectsNestedOptionCallbacks = Expect<
  Equal<ValidViewInputs<NestedOptionCallbacks>, never>
>
type RejectsNestedOptionalCallbacks = Expect<
  Equal<ValidViewInputs<NestedOptionalCallbacks>, never>
>
type RejectsNestedTupleCallbacks = Expect<
  Equal<ValidViewInputs<NestedTupleCallbacks>, never>
>
type RejectsNestedUnionCallbacks = Expect<
  Equal<ValidViewInputs<NestedUnionCallbacks>, never>
>
type RejectsTopLevelUnionCallbacks = Expect<
  Equal<ValidViewInputs<TopLevelUnionCallbacks>, never>
>
type RejectsPartialVNodeLikeCallbacks = Expect<
  Equal<ValidViewInputs<PartialVNodeLikeCallbacks>, never>
>
type RejectsPipeableCallbacks = Expect<
  Equal<ValidViewInputs<PipeableCallbacks>, never>
>
type RejectsRecursiveUnionCallbacks = Expect<
  Equal<ValidViewInputs<Readonly<{ tree: RecursiveUnionCallbacks }>>, never>
>
type PreservesAcceptedViewInputs = Expect<
  Equal<ValidViewInputs<AcceptedViewInputs>, AcceptedViewInputs>
>

const ViewInputsNamespace = makeNamespace('ViewInputsValidation')
const ViewInputsModel = Schema.Struct({ id: Schema.String })
type ViewInputsModel = typeof ViewInputsModel.Type
const ViewInputsMessage = defineMessageUnion({ CompletedObserve: {} })
type ViewInputsMessage = typeof ViewInputsMessage.Type
const Observe = ViewInputsNamespace.makeMount('Observe', {
  messages: [ViewInputsMessage.CompletedObserve],
})
const ViewInputsComposition = ViewInputsNamespace.makeDefinition({
  Model: ViewInputsModel,
  Message: ViewInputsMessage,
}).makeComposition({ mounts: [Observe] })

const acceptedView =
  ViewInputsComposition.makeView.withInputs<AcceptedViewInputs>(
    (model, _viewInputs, h) => h.div([h.OnMount(Observe())], [model.id]),
  )

const dateBearingView =
  ViewInputsComposition.makeView.withInputs<DateBearingInputs>(
    (_model, { report }, h) => h.div([], [report.createdAt.toISOString()]),
  )

type GenericViewInputs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToView: (item: Item) => Html
}>

const GenericViewInputsComposition = makeNamespace(
  'GenericViewInputsValidation',
)
  .makeDefinition({
    Model: ViewInputsModel,
    Message: ViewInputsMessage,
  })
  .makeComposition()

const makeGenericView = <Item>() =>
  GenericViewInputsComposition.makeView.withInputs<GenericViewInputs<Item>>(
    (_model, _viewInputs, h) => h.empty,
  )

const makeGenericBlock = <Item>() => {
  const view = makeGenericView<Item>()

  const prepare = () =>
    GenericViewInputsComposition.prepareBlock({
      init: () => ({ model: ViewInputsModel.make({ id: 'child' }) }),
      update: GenericViewInputsComposition.makeUpdate({
        CompletedObserve: model => ({ model }),
      }),
      view,
      EffectsLayer: Layer.empty,
      operations: {},
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof ViewInputsModel,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

type CallbackItem = Readonly<{
  id: string
  onSubmit: () => unknown
}>

const callbackItemBlock = makeGenericBlock<CallbackItem>()
const stringItemBlock = makeGenericBlock<string>()
const callbackItemView = makeGenericView<CallbackItem>()
const ParentModel = Schema.Struct({ child: ViewInputsModel })
type ParentModel = typeof ParentModel.Type
const ParentDefinition = makeNamespace(
  'ViewInputsValidationParent',
).makeDefinition({
  Model: ParentModel,
  Message: Schema.Never,
})
const CallbackItemBinding = ParentDefinition.makeBinding(callbackItemBlock, {
  field: 'child',
})
const StringItemBinding = ParentDefinition.makeBinding(stringItemBlock, {
  field: 'child',
})

const acceptedGenericConfig = StringItemBinding.embedView({
  slotId: 'string-child',
  model: ViewInputsModel.make({ id: 'string-child' }),
  viewInputs: {
    items: ['first'],
    itemToView: () => null,
  },
})

const callbackItemConfig = {
  slotId: 'callback-child',
  model: ViewInputsModel.make({ id: 'callback-child' }),
  viewInputs: {
    items: [{ id: 'item', onSubmit: () => undefined }],
    itemToView: () => null,
  },
}

const rejectConcreteGenericCallbacks = () =>
  // @ts-expect-error Instantiating a generic view with nested callbacks keeps its config invalid.
  CallbackItemBinding.embedView(callbackItemConfig)

const rejectNestedRecordCallbacks = () =>
  ViewInputsComposition.makeView.withInputs<NestedRecordCallbacks>(
    // @ts-expect-error Nested callback records cannot be scoped to the parent Block.
    (_model, _viewInputs, h) => h.empty,
  )

const rejectNestedArrayCallbacks = () =>
  ViewInputsComposition.makeView.withInputs<NestedArrayCallbacks>(
    // @ts-expect-error Callbacks in nested array elements cannot be scoped to the parent Block.
    (_model, _viewInputs, h) => h.empty,
  )

const rejectNestedOptionCallbacks = () =>
  ViewInputsComposition.makeView.withInputs<NestedOptionCallbacks>(
    // @ts-expect-error Option does not hide a statically visible nested callback.
    (_model, _viewInputs, h) => h.empty,
  )

type AcceptedViewParametersAreExact = Expect<
  Equal<
    Parameters<typeof acceptedView>,
    [
      model: ViewInputsModel,
      viewInputs: AcceptedViewInputs,
      h: HtmlBuilder<ViewInputsMessage, Mount.RequirementsOf<typeof Observe>>,
    ]
  >
>

type CallbackItemViewStillRequiresInputs = Expect<
  Equal<Parameters<typeof callbackItemView>['length'], 3>
>

export type ViewInputsAssertions = [
  PreservesDateBearingInputs,
  PreservesEffectDateTimeInputs,
  RejectsDateWithCallback,
  RejectsInspectableWithCallback,
  RejectsDateTimeWithCallback,
  RejectsDateTimeOrCallback,
  RejectsDateTimeCallbacksInArray,
  RejectsDateTimeCallbacksInOption,
  IdentifiesDateTimeCallbackPath,
  IdentifiesDateTimeArrayCallbackPath,
  IdentifiesDateTimeOptionCallbackPath,
  IdentifiesNestedCallbackPath,
  OmitsOptionalTopLevelCallbackPath,
  RejectsNestedRecordCallbacks,
  RejectsNestedArrayCallbacks,
  RejectsTopLevelArrayCallbacks,
  RejectsNestedOptionCallbacks,
  RejectsNestedOptionalCallbacks,
  RejectsNestedTupleCallbacks,
  RejectsNestedUnionCallbacks,
  RejectsTopLevelUnionCallbacks,
  RejectsPartialVNodeLikeCallbacks,
  RejectsPipeableCallbacks,
  RejectsRecursiveUnionCallbacks,
  PreservesAcceptedViewInputs,
  AcceptedViewParametersAreExact,
  CallbackItemViewStillRequiresInputs,
]

describe('ValidViewInputs', () => {
  it('preserves Schema-backed data whose methods live on its prototype', () => {
    const item = SchemaBackedItem.make({ id: 'item-1' })

    expect(Object.keys(item)).toEqual(['id'])
    expect(acceptedView).toBeTypeOf('function')
    expect(dateBearingView).toBeTypeOf('function')
    expect(rejectNestedRecordCallbacks).toBeTypeOf('function')
    expect(rejectNestedArrayCallbacks).toBeTypeOf('function')
    expect(rejectNestedOptionCallbacks).toBeTypeOf('function')
    expect(rejectConcreteGenericCallbacks).toBeTypeOf('function')
    expect(acceptedGenericConfig.slotId).toBe('string-child')
  })
})
