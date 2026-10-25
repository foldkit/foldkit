import { type DateTime, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Expect<Value extends true> = Value

export const ViewInputsModel = Schema.Struct({ id: Schema.String })
export type ViewInputsModel = typeof ViewInputsModel.Type

export const ViewInputsMessage = defineMessageUnion({ CompletedObserve: {} })
export type ViewInputsMessage = typeof ViewInputsMessage.Type

export class SchemaBackedItem extends Schema.Class<SchemaBackedItem>(
  'DeclarationViewInputsItem',
)({
  id: Schema.String,
}) {}

export type RecursiveItem = Readonly<{
  id: string
  children: ReadonlyArray<RecursiveItem>
}>

export type ViewInputs = Readonly<{
  toView: (
    value: Readonly<{ nestedCallback: () => unknown }>,
  ) => Readonly<{ nestedCallback: () => unknown }>
  content: Html
  attributes: ReadonlyArray<ChildAttribute>
  maybeLabel: Option.Option<Readonly<{ label: string }>>
  item: SchemaBackedItem
  recursive: RecursiveItem
}>

export type DateBearingInputs = Readonly<{
  report: Readonly<{
    createdAt: Date
    timeline: ReadonlyArray<Readonly<{ at: Date }>>
    maybeExpiresAt: Option.Option<Date>
    range: readonly [Date, Date]
    byId: Readonly<Record<string, Readonly<{ at: Date }>>>
    utc: DateTime.Utc
    zoned: DateTime.Zoned
    timeZone: DateTime.TimeZone
    namedTimeZone: DateTime.TimeZone.Named
    effectTimeline: ReadonlyArray<Readonly<{ at: DateTime.Utc }>>
    maybeEffectDeadline: Option.Option<DateTime.Zoned>
  }>
}>

const DeclarationViewInputsNamespace = Block.makeNamespace(
  'DeclarationViewInputs',
)

export const Observe = DeclarationViewInputsNamespace.makeMount('Observe', {
  messages: [ViewInputsMessage.CompletedObserve],
})

export const DeclarationViewInputsComposition =
  DeclarationViewInputsNamespace.makeDefinition({
    Model: ViewInputsModel,
    Message: ViewInputsMessage,
  }).makeComposition({ mounts: [Observe] })

export const view =
  DeclarationViewInputsComposition.makeView.withInputs<ViewInputs>(
    (model, _viewInputs, h) => h.div([h.OnMount(Observe())], [model.id]),
  )

export type GenericViewInputs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  itemToView: (item: Item) => Html
}>

export const DeclarationGenericViewInputsComposition = Block.makeNamespace(
  'DeclarationGenericViewInputs',
)
  .makeDefinition({
    Model: ViewInputsModel,
    Message: ViewInputsMessage,
  })
  .makeComposition()

export const dateBearingView =
  DeclarationGenericViewInputsComposition.makeView.withInputs<DateBearingInputs>(
    (_model, { report }, h) => h.div([], [report.createdAt.toISOString()]),
  )

const prepareDateInputBlock = () =>
  DeclarationGenericViewInputsComposition.prepareBlock({
    init: () => ({ model: ViewInputsModel.make({ id: 'date-child' }) }),
    update: DeclarationGenericViewInputsComposition.makeUpdate({
      CompletedObserve: model => ({
        model,
      }),
    }),
    view: dateBearingView,
  })
export const DateInputBlock: Block.FromAssemblyWithView<
  typeof ViewInputsModel,
  typeof prepareDateInputBlock
> = Block.assemble(prepareDateInputBlock)

export const makeGenericBlock = <Item>() => {
  const genericView =
    DeclarationGenericViewInputsComposition.makeView.withInputs<
      GenericViewInputs<Item>
    >((_model, _viewInputs, h) => h.empty)

  const prepare = () =>
    DeclarationGenericViewInputsComposition.prepareBlock({
      init: () => ({ model: ViewInputsModel.make({ id: 'generic-child' }) }),
      update: DeclarationGenericViewInputsComposition.makeUpdate({
        CompletedObserve: model => ({
          model,
        }),
      }),
      view: genericView,
      EffectsLayer: Layer.empty,
      operations: {},
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof ViewInputsModel,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

const blockView =
  DeclarationGenericViewInputsComposition.makeView.withInputs<ViewInputs>(
    (_model, _viewInputs, h) => h.empty,
  )

type ViewParametersAreExact = Expect<
  Equal<
    Parameters<typeof view>,
    [
      model: ViewInputsModel,
      viewInputs: ViewInputs,
      h: HtmlBuilder<ViewInputsMessage, Mount.RequirementsOf<typeof Observe>>,
    ]
  >
>

const prepareBlock = () =>
  DeclarationGenericViewInputsComposition.prepareBlock({
    init: () => ({ model: ViewInputsModel.make({ id: 'child' }) }),
    update: DeclarationGenericViewInputsComposition.makeUpdate({
      CompletedObserve: model => ({
        model,
      }),
    }),
    view: blockView,
    EffectsLayer: Layer.empty,
    operations: {},
  })
export const block: Block.FromAssemblyWithView<
  typeof ViewInputsModel,
  typeof prepareBlock
> = Block.assemble(prepareBlock)

const ParentModel = Schema.Struct({ child: ViewInputsModel })
const DeclarationViewInputsParentDefinition = Block.makeDefinition(
  'DeclarationViewInputsParent',
  {
    Model: ParentModel,
    Message: Schema.Never,
  },
)

export const ChildBinding = DeclarationViewInputsParentDefinition.makeBinding(
  block,
  {
    field: 'child',
  },
)

export const childConfig = ChildBinding.embedView({
  slotId: 'child',
  model: ViewInputsModel.make({ id: 'child' }),
  viewInputs: {
    toView: value => value,
    content: null,
    attributes: [],
    maybeLabel: Option.some({ label: 'Child' }),
    item: SchemaBackedItem.make({ id: 'item' }),
    recursive: { id: 'root', children: [] },
  },
})

export type ViewInputAssertions = [ViewParametersAreExact]
