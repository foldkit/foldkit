import { type DateTime, type Inspectable, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'

import {
  DeclarationViewInputsComposition,
  ViewInputsModel,
  makeGenericBlock,
} from './view-inputs.accepted.js'

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{ config: Readonly<{ onSubmit: () => unknown }> }>
>(
  // @ts-expect-error Nested callback records cannot be scoped to the parent Block.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    config: Readonly<{ createdAt: Date; onSubmit: () => unknown }>
  }>
>(
  // @ts-expect-error A Date field does not hide a sibling nested application callback.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    dates: ReadonlyArray<Date & Readonly<{ onSelect: () => unknown }>>
  }>
>(
  // @ts-expect-error Added Date fields are checked even though standard prototype methods are allowed.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    maybeEvent: Option.Option<Readonly<{ at: Date; onSelect: () => unknown }>>
  }>
>(
  // @ts-expect-error Option does not hide application callbacks beside Date data.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    utc: DateTime.Utc & Readonly<{ onSelect: () => unknown }>
  }>
>(
  // @ts-expect-error Effect DateTime protocol methods are allowed without hiding added callbacks.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    zoned: DateTime.Zoned & Readonly<{ onSelect: () => unknown }>
  }>
>(
  // @ts-expect-error Added callbacks remain visible on zoned DateTime values.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    timeZone: DateTime.TimeZone & Readonly<{ onSelect: () => unknown }>
  }>
>(
  // @ts-expect-error Added callbacks remain visible on TimeZone values.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    value: Inspectable.Inspectable & Readonly<{ onSelect: () => unknown }>
  }>
>(
  // @ts-expect-error Inspectable protocol methods do not hide application callbacks.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    value: DateTime.Utc | Readonly<{ onSelect: () => unknown }>
  }>
>(
  // @ts-expect-error A safe protocol branch does not hide an unsafe union branch.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    values: ReadonlyArray<DateTime.Utc & Readonly<{ onSelect: () => unknown }>>
  }>
>(
  // @ts-expect-error Arrays retain callback evidence from their DateTime elements.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    maybeValue: Option.Option<
      DateTime.Utc & Readonly<{ onSelect: () => unknown }>
    >
  }>
>(
  // @ts-expect-error Option retains callback evidence from its DateTime value.
  (_model, _viewInputs, h) => h.empty,
)

type CallbackItem = Readonly<{
  id: string
  onSubmit: () => unknown
}>

const callbackItemBlock = makeGenericBlock<CallbackItem>()
const ParentModel = Schema.Struct({ child: ViewInputsModel })
const DeclarationGenericViewInputsParentDefinition = Block.makeDefinition(
  'DeclarationGenericViewInputsParent',
  {
    Model: ParentModel,
    Message: Schema.Never,
  },
)
const CallbackItemBinding =
  DeclarationGenericViewInputsParentDefinition.makeBinding(callbackItemBlock, {
    field: 'child',
  })

const callbackItemConfig = {
  slotId: 'callback-child',
  model: ViewInputsModel.make({ id: 'callback-child' }),
  viewInputs: {
    items: [{ id: 'item', onSubmit: () => undefined }],
    itemToView: () => null,
  },
}

// @ts-expect-error A concrete callback-bearing generic item cannot enter an embedded view config.
CallbackItemBinding.embedView(callbackItemConfig)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    rows: ReadonlyArray<Readonly<{ id: string; onSubmit: () => unknown }>>
  }>
>(
  // @ts-expect-error Callbacks in nested array elements cannot be scoped to the parent Block.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  ReadonlyArray<Readonly<{ id: string; onSubmit: () => unknown }>>
>(
  // @ts-expect-error A callback-bearing array cannot itself be used as ViewInputs.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    maybeConfig: Option.Option<Readonly<{ onSubmit: () => unknown }>>
  }>
>(
  // @ts-expect-error Option does not hide a statically visible nested callback.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{ config: Readonly<{ onSubmit?: () => unknown }> }>
>(
  // @ts-expect-error Optional nested callbacks are still unsafe when present.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    rows: readonly [
      Readonly<{ id: string }>,
      Readonly<{ onSubmit: () => unknown }>,
    ]
  }>
>(
  // @ts-expect-error Tuple elements retain nested callback evidence.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    config: Readonly<{ label: string }> | Readonly<{ onSubmit: () => unknown }>
  }>
>(
  // @ts-expect-error One unsafe union branch makes the ViewInputs unsafe.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  | Readonly<{ label: string }>
  | Readonly<{ config: Readonly<{ onSubmit: () => unknown }> }>
>(
  // @ts-expect-error One unsafe top-level union branch makes the ViewInputs unsafe.
  (_model, _viewInputs, h) => h.empty,
)

type RecursiveCallbacks = Readonly<{
  id: string
  next?: RecursiveCallbacks
  branch: RecursiveCallbacks | Readonly<{ onSubmit: () => unknown }>
}>

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{ tree: RecursiveCallbacks }>
>(
  // @ts-expect-error Cycle detection still inspects a distinct unsafe union branch.
  (_model, _viewInputs, h) => h.empty,
)

DeclarationViewInputsComposition.makeView.withInputs<
  Readonly<{
    content: Readonly<{
      id: string
      key: string
      data: Readonly<{ onSubmit: () => unknown }>
    }>
  }>
>(
  // @ts-expect-error Ordinary key/data records do not qualify as Html.
  (_model, _viewInputs, h) => h.empty,
)
