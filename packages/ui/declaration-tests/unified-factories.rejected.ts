import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'

import * as Combobox from '@foldkit/ui/combobox'
import * as Listbox from '@foldkit/ui/listbox'
import * as Menu from '@foldkit/ui/menu'

import {
  type Fruit,
  FruitListbox,
  FruitListboxBinding,
  FruitMultiListbox,
  FruitOption,
  FruitOptionListbox,
  FruitTabs,
  MemberListbox,
  Picker,
  PickerBinding,
  PickerLayer,
  Quotes,
  QuotesLayer,
  Windows,
} from './unified-factories.accepted.js'
class ItemService extends Context.Service<
  ItemService,
  Readonly<{ value: string }>
>()('UnifiedFactory/ItemService') {}
const ServicefulItem = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value => Effect.as(ItemService, value),
      encode: value => Effect.succeed(value),
    }),
  ),
)
// @ts-expect-error Combobox intentionally requires synchronous, service-free Item Codecs.
Combobox.makeBlock(ServicefulItem)
// @ts-expect-error Multi Combobox has the same service-free Item Codec contract.
Combobox.Multi.makeBlock(ServicefulItem)
// @ts-expect-error Listbox selection Codecs cannot require decoding Services.
Listbox.makeBlock(ServicefulItem)
// @ts-expect-error Multi Listbox enforces the same selected-value contract.
Listbox.Multi.makeBlock(ServicefulItem)
// @ts-expect-error An object Item witness does not erase selected-value Services.
Listbox.makeBlock(Schema.Struct({ label: Schema.String }), ServicefulItem)
const ServicefulEncoding = Schema.String.pipe(
  Schema.decodeTo(
    Schema.String,
    SchemaTransformation.transformEffect({
      decode: value => Effect.succeed(value),
      encode: value => Effect.as(ItemService, value),
    }),
  ),
)
// @ts-expect-error Encoding Services also violate the self-contained Value contract.
Listbox.makeBlock(ServicefulEncoding)
// @ts-expect-error Multi Listbox cannot erase encoding Services either.
Listbox.Multi.makeBlock(ServicefulEncoding)
// @ts-expect-error A rendering object Schema is not a string Value Schema.
Listbox.makeBlock(Schema.Struct({ value: Schema.String }))
// @ts-expect-error Selected values must be strings.
Listbox.Multi.makeBlock(Schema.Number)
const MissingHost = Query.define({
  name: 'MissingHost',
  data: Schema.String,
  error: Schema.String,
})
if (false) {
  // @ts-expect-error A narrow Listbox requires its runtime Schema.
  Listbox.makeBlock<Fruit>()
  // @ts-expect-error Multi Listbox requires the runtime Schema as well.
  Listbox.Multi.makeBlock<Fruit>()
  // @ts-expect-error A branded Value constructor requires the branded value.
  MemberListbox.Message.RequestedSelectItem({ item: 'member-1' })
  // @ts-expect-error Selection constructors preserve the exact declared Value.
  FruitListbox.Message.SelectedItem({ item: 'Orange' })
  // @ts-expect-error Programmatic selection uses the same Value contract.
  FruitMultiListbox.Message.RequestedSelectItem({ item: 'Orange' })
  // @ts-expect-error OutMessage constructors do not accept a wider string.
  FruitListbox.OutMessage.Selected({ value: 'Orange' })
  // @ts-expect-error Extracted bound operations preserve the selected Value.
  FruitListboxBinding.requestSelectItem('Orange')
  const singleWithMultiLayer = {
    block: FruitListbox,
    layer: Listbox.Multi.layer,
  }
  // @ts-expect-error Single and Multi retain separate family providers.
  Story.withBlock(singleWithMultiLayer, () => undefined)
  const multiWithSingleLayer = {
    block: FruitMultiListbox,
    layer: Listbox.layer,
  }
  // @ts-expect-error A Single provider cannot supply a Multi specialization.
  Story.withBlock(multiWithSingleLayer, () => undefined)
  // @ts-expect-error An object Item requires its value extractor.
  const missingObjectExtractor: Listbox.ViewInputs<FruitOption, Fruit> = {
    items: [FruitOption.make({ label: 'Apple', value: 'Apple' })],
    maybeSelectedValue: Option.none(),
    itemToConfig: () => ({ content: null }),
    buttonContent: null,
  }
  void missingObjectExtractor
  const wrongExtractor: Listbox.ViewInputs<FruitOption, Fruit> = {
    items: [],
    maybeSelectedValue: Option.none(),
    // @ts-expect-error A mapping cannot emit values outside the Value Schema.
    itemToValue: () => 'Orange',
    itemToConfig: () => ({ content: null }),
    buttonContent: null,
  }
  void wrongExtractor
  // @ts-expect-error A selected Value is exact even when rendering uses objects.
  FruitOptionListbox.Message.SelectedItem({ item: 'Orange' })
  // @ts-expect-error A broad string Item needs an explicit mapping to narrow Fruit.
  const missingExtractor: Listbox.ViewInputs<string, Fruit> = {
    items: ['arbitrary'],
    maybeSelectedValue: Option.none(),
    itemToConfig: () => ({ content: null }),
    buttonContent: null,
  }
  void missingExtractor
  // @ts-expect-error Public schema-specialized factories expose no getter.
  Picker.get
  Picker.Message.SelectedItem({
    // @ts-expect-error The exact Item Schema rejects another item.
    item: 'Orange',
    displayText: 'Orange',
    wasSelected: false,
  })
  // @ts-expect-error Bound operations preserve the exact Item type.
  PickerBinding.requestSelectItem('Orange', 'Orange')
  const OtherPicker = Combobox.makeBlock(Schema.Literals(['Orange']))
  // @ts-expect-error A different Item specialization cannot use this exact selected provider.
  Story.withBlock({ block: OtherPicker, layer: PickerLayer }, () => undefined)
  // @ts-expect-error Empty providers do not satisfy an original schema-specialized Block.
  Story.withBlock({ block: Picker, layer: Layer.empty }, () => undefined)
  // @ts-expect-error Fixed erased families do not expose implementation producers.
  FruitTabs.makeLayer
  // @ts-expect-error Fixed erased families do not select arbitrary host providers.
  FruitTabs.provideHandlers
  // @ts-expect-error A closed Menu provider cannot attest a Tabs specialization.
  Story.withBlock({ block: FruitTabs, layer: Menu.layer }, () => undefined)
  // @ts-expect-error Shared providers require selected original host handlers.
  Story.withBlock({ block: MissingHost, layer: Query.layer }, () => 0)

  // @ts-expect-error A custom selected provider supplies only its exact specialization, not a universal family provider.
  Story.withBlock({ block: Windows, layer: QuotesLayer }, () => undefined)
  // @ts-expect-error Ambient shared providers cannot repair an explicitly mismatched custom selection.
  Story.withBlock({ block: Windows, layer: QuotesLayer }, () => undefined).pipe(
    Effect.provide(Query.layer),
  )
  // @ts-expect-error Empty Layers cannot provide schema-family specializations.
  Story.withBlock({ block: Quotes, layer: Layer.empty }, () => undefined)
}
