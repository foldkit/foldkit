import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import * as AsyncData from 'foldkit/asyncData'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'

import * as Animation from '@foldkit/ui/animation'
import * as Combobox from '@foldkit/ui/combobox'
import * as Listbox from '@foldkit/ui/listbox'
import * as Menu from '@foldkit/ui/menu'
import * as RadioGroup from '@foldkit/ui/radioGroup'
import * as Tabs from '@foldkit/ui/tabs'
import * as VirtualList from '@foldkit/ui/virtualList'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
export const Fruit = Schema.Literals(['Apple', 'Pear'])
export type Fruit = typeof Fruit.Type
export const Picker = Combobox.makeBlock(Fruit)
export const MultiPicker = Combobox.Multi.makeBlock(Fruit)
export const EncodedItem = Schema.Number.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transform({
      decode: globalThis.String,
      encode: globalThis.Number,
    }),
  ),
)
export const EncodedPicker = Combobox.makeBlock(EncodedItem)
export const FruitListbox = Listbox.makeBlock(Fruit)
export const MemberId = Schema.String.pipe(Schema.brand('MemberId'))
export type MemberId = typeof MemberId.Type
export const MemberListbox = Listbox.makeBlock(MemberId)
export const selectedMember = MemberListbox.Message.SelectedItem({
  item: MemberId.make('member-1'),
})
export const FruitMultiListbox = Listbox.Multi.makeBlock(Fruit)
export const EncodedListbox = Listbox.makeBlock(EncodedItem)
export const EncodedMultiListbox = Listbox.Multi.makeBlock(EncodedItem)
export const FruitOption = Schema.Struct({ label: Schema.String, value: Fruit })
export type FruitOption = typeof FruitOption.Type
export const FruitOptionListbox = Listbox.makeBlock(FruitOption, Fruit)
export const StringToFruitListbox = Listbox.makeBlock(Schema.String, Fruit)
export const directFruitInputs: Listbox.ViewInputs<string, Fruit> = {
  items: ['Apple', 'Pear'],
  maybeSelectedValue: Option.none(),
  itemToConfig: () => ({ content: null }),
  buttonContent: null,
}
export const mappedFruitInputs: Listbox.ViewInputs<string, Fruit> = {
  items: ['APPLE'],
  itemToValue: () => 'Apple',
  maybeSelectedValue: Option.none(),
  itemToConfig: () => ({ content: null }),
  buttonContent: null,
}
export const pairedFruitListbox = Story.withBlock(
  { block: FruitListbox, layer: Listbox.layer },
  executable =>
    executable.operations.requestSelectItem(
      executable.init({ id: 'fruit' }).model,
      'Apple',
    ),
)
export const FruitMenu = Menu.makeBlock<Fruit>()
export const FruitRadioGroup = RadioGroup.makeBlock<Fruit>()
export const FruitTabs = Tabs.makeBlock<Fruit>()
export const FruitVirtualList = VirtualList.makeBlock<Fruit>()
export const pairedTabs = Story.withBlock(
  { block: FruitTabs, layer: Tabs.layer },
  executable => executable.init({ id: 'tabs' }),
)
export const pairedMenu = Story.withBlock(
  { block: FruitMenu, layer: Menu.layer },
  executable => executable.init({ id: 'menu' }),
)
export const pairedRadioGroup = Story.withBlock(
  { block: FruitRadioGroup, layer: RadioGroup.layer },
  executable => executable.init({ id: 'radio-group' }),
)
export const pairedVirtualList = Story.withBlock(
  { block: FruitVirtualList, layer: VirtualList.layer },
  executable => executable.init({ id: 'virtual-list', rowHeightPx: 30 }),
)
export const Quotes = Query.define({
  name: 'UnifiedFactoryQuotes',
  data: Schema.String,
  error: Schema.String,
  handler: function* () {
    return () => Effect.succeed('quote')
  },
})
export const Windows = Query.define({
  name: 'UnifiedFactoryWindows',
  args: { label: Schema.String },
  data: Schema.String,
  error: Schema.String,
  handler: function* () {
    return ({ label }) => Effect.succeed(label)
  },
})
export const pairedQuotes = Story.withBlock(
  { block: Quotes, layer: Query.layer },
  executable => executable.init(),
)
export const pairedWindows = Story.withBlock(
  { block: Windows, layer: Query.layer },
  executable => executable.init(),
)
export class Construction extends Context.Service<
  Construction,
  Readonly<{ isUnavailable: boolean }>
>()('UnifiedFactory/Construction') {}
const ServicefulLabel = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value => Effect.as(Construction, value),
      encode: value => Effect.as(Construction, value),
    }),
  ),
)
export const ServicefulOptionListbox = Listbox.makeBlock(
  Schema.Struct({ label: ServicefulLabel, value: Fruit }),
  Fruit,
)
export const pairedServicefulOptionListbox = Story.withBlock(
  { block: ServicefulOptionListbox, layer: Listbox.layer },
  executable => executable.init({ id: 'serviceful-option' }),
)
export const ConstructionError = Schema.Struct({ reason: Schema.String })
export type ConstructionError = typeof ConstructionError.Type
const QuoteComposition = Quotes.makeComposition()
const initQuote = QuoteComposition.makeInit(() => ({
  model: Quotes.Model.make({ data: AsyncData.Idle(), generation: 0 }),
}))
const updateQuote = QuoteComposition.makeUpdate({
  RequestedLoadIfStale: Quotes.makeCommandsStep(model => [
    Quotes.Fetch({ generation: model.generation + 1 }),
  ]),
  CompletedFetch: Quotes.makeNoopStep(),
  CompletedCancelFetch: Quotes.makeNoopStep(),
})
const receiveQuote = QuoteComposition.makeInMessageUpdate({
  RequestedReset: Quotes.makeNoopStep(),
  RequestedRevalidation: Quotes.makeNoopStep(),
  RequestedRevalidationOrLoad: Quotes.makeNoopStep(),
  RequestedLoadIfMissing: Quotes.makeNoopStep(),
  RequestedCancel: Quotes.makeNoopStep(),
})
export const QuotesLayer = Quotes.makeLayer(
  Effect.gen(function* () {
    const construction = yield* Construction

    if (construction.isUnavailable) {
      return yield* Effect.fail(
        ConstructionError.make({ reason: 'unavailable' }),
      )
    }

    return {
      children: [],
      init: initQuote,
      update: updateQuote,
      inMessageUpdate: receiveQuote,
      EffectsLayer: Layer.empty,
      hostHandlers: [Quotes.Fetch],
    }
  }),
)
export const selectedQuotes = Story.withBlock(
  { block: Quotes, layer: QuotesLayer },
  executable => executable.init(),
)
export const providedQuotes = Story.withBlock(Quotes, executable =>
  executable.init(),
).pipe(Effect.provide(QuotesLayer))
const Composition = Picker.makeComposition()
const init = Composition.makeInit(config => ({
  model: Picker.Model.make({
    id: config.id,
    isOpen: false,
    isAnimated: false,
    isModal: false,
    nullable: false,
    immediate: false,
    selectInputOnFocus: false,
    animation: Animation.AnimationBlock.Model.make({
      id: `${config.id}-panel`,
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    }),
    maybeActiveItemIndex: Option.none(),
    activationTrigger: 'Keyboard',
    inputValue: '',
    maybeLastPointerPosition: Option.none(),
  }),
}))
const update = Composition.makeUpdate({
  RequestedClose: Picker.makeNoopStep(),
  RequestedSelectItem: Picker.makeNoopStep(),
  Opened: Picker.makeNoopStep(),
  Closed: Picker.makeNoopStep(),
  BlurredInput: Picker.makeNoopStep(),
  ActivatedItem: Picker.makeNoopStep(),
  DeactivatedItem: Picker.makeNoopStep(),
  SelectedItem: Picker.makeNoopStep(),
  MovedPointerOverItem: Picker.makeNoopStep(),
  RequestedItemClick: Picker.makeNoopStep(),
  SuppressedItemCommit: Picker.makeNoopStep(),
  SuppressedEmptyItemNavigation: Picker.makeNoopStep(),
  CompletedLockScroll: Picker.makeNoopStep(),
  CompletedUnlockScroll: Picker.makeNoopStep(),
  CompletedInertOthers: Picker.makeNoopStep(),
  CompletedRestoreInert: Picker.makeNoopStep(),
  CompletedFocusInput: Picker.makeNoopStep(),
  CompletedScrollItemIntoView: Picker.makeNoopStep(),
  CompletedClickItem: Picker.makeNoopStep(),
  CompletedAnchor: Picker.makeNoopStep(),
  CompletedAttachPreventBlur: Picker.makeNoopStep(),
  CompletedAttachSelectOnFocus: Picker.makeNoopStep(),
  CompletedPortalBackdrop: Picker.makeNoopStep(),
  CompletedDetectMovementOrAnimationEnd: Picker.makeNoopStep(),
  UpdatedInputValue: Picker.makeNoopStep(),
  PressedToggleButton: Picker.makeNoopStep(),
})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedOpen: Picker.makeNoopStep(),
})
const view = Composition.makeView.withInputs((_model, inputs, h) =>
  h.div([], [Option.getOrElse(inputs.maybeSelectedValue, () => 'Apple')]),
)
export const PickerLayer = Picker.makeLayer(
  Effect.gen(function* () {
    const construction = yield* Construction

    if (construction.isUnavailable) {
      return yield* Effect.fail(
        ConstructionError.make({ reason: 'unavailable' }),
      )
    }

    return { children: [], init, update, inMessageUpdate, view }
  }),
)
export const selectedPicker = Story.withBlock(
  { block: Picker, layer: PickerLayer },
  executable => executable.init({ id: 'selected' }),
).pipe(Effect.provide(Combobox.layer))
export const ordinaryPicker = Story.withBlock(Picker, executable =>
  executable.init({ id: 'ordinary' }),
).pipe(Effect.provide(Combobox.layer))
export const ordinaryMultiPicker = Story.withBlock(MultiPicker, executable =>
  executable.init({ id: 'multi' }),
).pipe(Effect.provide(Combobox.Multi.layer))
export const ParentKey = Symbol('UnifiedFactoryParent')
export const UnifiedFactoryParentBlock = Block.make('UnifiedFactoryParent', {
  key: ParentKey,
  Model: Schema.Struct({ picker: Picker.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
export const PickerBinding = UnifiedFactoryParentBlock.makeRequiredFieldBinding(
  Picker,
  {
    field: 'picker',
    init: { contextToArgs: () => [{ id: 'child' }] },
  },
).withOutMessagePolicy({
  fold: UnifiedFactoryParentBlock.makeOutMessageFold(Picker, {
    Selected: ({ value }) => {
      const _fruit: Fruit = value
      void _fruit
      return UnifiedFactoryParentBlock.makeNoopStep()
    },
    ClearedSelection: () => UnifiedFactoryParentBlock.makeNoopStep(),
  }),
})
export const childConstruction = Effect.gen(function* () {
  return yield* PickerBinding
}).pipe(Effect.provide(Combobox.layer))

export const ListboxParentKey = Symbol('ListboxParent')
export const ListboxParentBlock = Block.make('ListboxParent', {
  key: ListboxParentKey,
  Model: Schema.Struct({
    fruitListbox: FruitOptionListbox.Model,
    maybeFruit: Schema.Option(Fruit),
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const FruitListboxBinding = ListboxParentBlock.makeRequiredFieldBinding(
  FruitOptionListbox,
  {
    field: 'fruitListbox',
    init: { contextToArgs: () => [{ id: 'fruit-option' }] },
  },
).withOutMessagePolicy({
  fold: ListboxParentBlock.makeOutMessageFold(FruitOptionListbox, {
    Selected: ({ value }) =>
      ListboxParentBlock.makeFieldsStep(() => ({
        maybeFruit: () => Option.some(value),
      })),
  }),
})
const ListboxParentComposition = ListboxParentBlock.makeComposition({
  bindings: [FruitListboxBinding],
})
const listboxParentInit = ListboxParentComposition.makeInit(() => ({
  model: { maybeFruit: Option.none() },
}))
const listboxParentUpdate = ListboxParentComposition.makeUpdate({})
export const listboxParentView = ListboxParentComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        FruitListboxBinding.embedView({
          slotId: 'fruit',
          model: model.fruitListbox,
          viewInputs: {
            items: [FruitOption.make({ label: 'Apple', value: 'Apple' })],
            maybeSelectedValue: model.maybeFruit,
            itemToValue: item => item.value,
            itemToConfig: (item, { isSelected }) => ({
              content: h.span(
                [],
                [isSelected ? `${item.label} selected` : item.label],
              ),
            }),
            buttonContent: h.span([], ['Fruit']),
          },
        }),
      ),
    ],
  ),
)
export const ListboxParentLayer = ListboxParentBlock.makeLayer(
  Effect.gen(function* () {
    const fruitListbox = yield* FruitListboxBinding

    return {
      children: [fruitListbox],
      init: listboxParentInit,
      update: listboxParentUpdate,
      view: listboxParentView,
    }
  }),
).pipe(Layer.provide(Listbox.layer))
export type Checks = readonly [
  Assert<Equal<'get' extends keyof typeof Picker ? true : false, false>>,
  Assert<
    Equal<'contract' extends keyof typeof MultiPicker ? true : false, false>
  >,
  Assert<Equal<Effect.Error<typeof selectedPicker>, ConstructionError>>,
  Assert<Equal<Effect.Services<typeof selectedPicker>, Construction>>,
  Assert<Equal<Effect.Services<typeof ordinaryPicker>, never>>,
  Assert<Equal<Effect.Services<typeof ordinaryMultiPicker>, never>>,
  Assert<Equal<Effect.Services<typeof pairedFruitListbox>, never>>,
  Assert<
    Equal<(typeof MemberListbox.Message.SelectedItem.Type)['item'], MemberId>
  >,
  Assert<Equal<Effect.Services<typeof pairedServicefulOptionListbox>, never>>,
  Assert<Equal<(typeof FruitListbox.Message.SelectedItem.Type)['item'], Fruit>>,
  Assert<
    Equal<
      (typeof FruitMultiListbox.Message.RequestedSelectItem.Type)['item'],
      Fruit
    >
  >,
  Assert<Equal<(typeof FruitListbox.OutMessage.Selected.Type)['value'], Fruit>>,
  Assert<
    Equal<(typeof EncodedListbox.Message.SelectedItem.Encoded)['item'], number>
  >,
  Assert<
    Equal<
      (typeof EncodedMultiListbox.Message.RequestedSelectItem.Encoded)['item'],
      number
    >
  >,
  Assert<
    Equal<
      (typeof EncodedMultiListbox.OutMessage.Selected.Encoded)['value'],
      number
    >
  >,
  Assert<Equal<Effect.Services<typeof childConstruction>, never>>,
  Assert<Equal<Effect.Services<typeof pairedQuotes>, never>>,
  Assert<Equal<Effect.Services<typeof pairedWindows>, never>>,
  Assert<Equal<Effect.Services<typeof pairedTabs>, never>>,
  Assert<Equal<Effect.Services<typeof pairedMenu>, never>>,
  Assert<Equal<Effect.Services<typeof pairedRadioGroup>, never>>,
  Assert<Equal<Effect.Services<typeof pairedVirtualList>, never>>,
  Assert<Equal<Effect.Services<typeof selectedQuotes>, Construction>>,
  Assert<Equal<Effect.Error<typeof selectedQuotes>, ConstructionError>>,
  Assert<Equal<Effect.Services<typeof providedQuotes>, Construction>>,
  Assert<Equal<(typeof Picker.Message.SelectedItem.Type)['item'], Fruit>>,
  Assert<
    Equal<(typeof EncodedPicker.Message.SelectedItem.Encoded)['item'], number>
  >,
]
