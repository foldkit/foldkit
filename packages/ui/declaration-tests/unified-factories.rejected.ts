import { Context, Effect, Layer, Schema, SchemaTransformation } from 'effect'
import * as Query from 'foldkit/experimental/query'
import * as Story from 'foldkit/story'

import * as Combobox from '@foldkit/ui/combobox'
import * as Menu from '@foldkit/ui/menu'

import {
  FruitTabs,
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
const MissingHost = Query.define({
  name: 'MissingHost',
  data: Schema.String,
  error: Schema.String,
})
if (false) {
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
