import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Message as MessageModule, Struct } from 'foldkit'

import { type Assembled, Store } from './from-assembly.accepted.js'
import type { Assert, Equal, SameMembers } from './from-assembly.assertions.js'

export const createPicker = <Item, Encoded, DecodingServices, EncodingServices>(
  ItemSchema: Schema.Codec<
    Item,
    Encoded,
    DecodingServices,
    EncodingServices
  > & {
    readonly '~type.make': Item
  },
) => {
  const Model = Schema.Struct({ selected: ItemSchema })
  const Message = MessageModule.defineMessageUnion({
    RequestedSelect: { selected: ItemSchema },
    CompletedSaveSelection: {},
    CompletedObservePicker: {},
  })
  const OutMessage = MessageModule.defineMessageUnion({
    Selected: { selected: ItemSchema },
  })
  const PickerDefinition = Block.makeDefinition('FromAssemblyPicker', {
    Model,
    Message,
    OutMessage,
  })
  const SaveSelection = PickerDefinition.makeCommand('SaveSelection', {
    messages: [Message.CompletedSaveSelection],
    handler: function* () {
      const store = yield* Store

      return () =>
        Effect.as(store.saveCount(1), Message.CompletedSaveSelection())
    },
  })
  const ObservePicker = PickerDefinition.makeMount('ObservePicker', {
    messages: [Message.CompletedObservePicker],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedObservePicker())
    },
  })
  const PickerComposition = PickerDefinition.makeComposition({
    mounts: [ObservePicker],
  })
  const init = PickerComposition.makeInit((selected: Item) => ({
    model: { selected },
  }))
  const update = PickerComposition.makeUpdate({
    RequestedSelect: (model, { selected }) => ({
      model: Struct.modifyFields(model, { selected: () => selected }),
      commands: [SaveSelection()],
      outMessage: OutMessage.Selected({ selected }),
    }),
    CompletedSaveSelection: model => ({ model }),
    CompletedObservePicker: model => ({ model }),
  })
  const view = PickerComposition.makeView.withInputs<
    Readonly<{ format: (selected: Item) => string }>
  >((model, { format }, h) =>
    h.div([h.OnMount(ObservePicker())], [format(model.selected)]),
  )
  const EffectsLayer = Layer.merge(SaveSelection.layer, ObservePicker.layer)
  const preparePickerBlock = () =>
    PickerComposition.prepareBlock({
      init,
      update,
      view,
      EffectsLayer,
      operations: { select: Message.RequestedSelect },
    })

  const OriginalPickerBlock: Assembled<typeof preparePickerBlock> =
    Block.assemble(preparePickerBlock)
  const PickerBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof preparePickerBlock
  > = Block.assemble(preparePickerBlock)
  const originalToAnnotated: typeof PickerBlock = OriginalPickerBlock
  const annotatedToOriginal: typeof OriginalPickerBlock = PickerBlock

  return {
    PickerBlock,
    OriginalPickerBlock,
    originalToAnnotated,
    annotatedToOriginal,
  }
}

export const NumericPicker = createPicker(Schema.NumberFromString)
export type NumericMembers = Assert<
  SameMembers<
    typeof NumericPicker.PickerBlock,
    typeof NumericPicker.OriginalPickerBlock
  >
>
export type NumericType = Assert<
  Equal<
    typeof NumericPicker.PickerBlock.Model.Type,
    Readonly<{ selected: number }>
  >
>
export type NumericEncoded = Assert<
  Equal<
    typeof NumericPicker.PickerBlock.Model.Encoded,
    Readonly<{ selected: string }>
  >
>
export type NumericServices = Assert<
  Equal<Layer.Services<typeof NumericPicker.PickerBlock.EffectsLayer>, Store>
>
export const numericSelection = NumericPicker.PickerBlock.operations.select(
  { selected: 0 },
  { selected: 1 },
)

// @ts-expect-error The decoded generic Item remains number rather than the encoded string.
NumericPicker.PickerBlock.operations.select({ selected: 0 }, { selected: '1' })

export const ColorPicker = createPicker(Schema.Literals(['Red', 'Blue']))
export type ColorType = Assert<
  Equal<
    typeof ColorPicker.PickerBlock.Model.Type,
    Readonly<{ selected: 'Red' | 'Blue' }>
  >
>
export const colorSelection = ColorPicker.PickerBlock.operations.select(
  { selected: 'Red' },
  { selected: 'Blue' },
)

ColorPicker.PickerBlock.operations.select(
  { selected: 'Red' },
  // @ts-expect-error The literal Item refinement survives the generic factory and completed annotation.
  { selected: 'Green' },
)

export class DecodeItem extends Context.Service<
  DecodeItem,
  Readonly<{ decode: true }>
>()('FromAssembly/DecodeItem') {}
export class EncodeItem extends Context.Service<
  EncodeItem,
  Readonly<{ encode: true }>
>()('FromAssembly/EncodeItem') {}
export declare const ItemSchema: Schema.Codec<
  number,
  string,
  DecodeItem,
  EncodeItem
> & { readonly '~type.make': number }
export const ServicePicker = createPicker(ItemSchema)
export type Decoding = Assert<
  Equal<typeof ServicePicker.PickerBlock.Model.DecodingServices, DecodeItem>
>
export type Encoding = Assert<
  Equal<typeof ServicePicker.PickerBlock.Model.EncodingServices, EncodeItem>
>
export const AnyValuePicker = createPicker(Schema.Any)
export type LegitimateAnyValue = Assert<
  Equal<
    typeof AnyValuePicker.PickerBlock.Model.Type,
    Readonly<{ selected: any }>
  >
>
