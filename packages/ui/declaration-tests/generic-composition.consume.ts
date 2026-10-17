import type * as Block from 'foldkit/block'

import {
  DialogBinding,
  Picker,
  PickerBinding,
  WithOutMessageOnly,
  WithViewAndOutMessage,
  WithViewOnly,
  WithoutViewOrOutMessage,
  createComposition,
} from './generic-composition.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type RelocatedAssertions = [
  Expect<Equal<Parameters<typeof DialogBinding.open>, []>>,
  Expect<
    Equal<
      Parameters<typeof PickerBinding.selectItem>,
      [item: 'Apple' | 'Pear', displayText: string]
    >
  >,
  Expect<
    Equal<
      Block.ViewBuilderFor<ReturnType<typeof createComposition>> extends never
        ? true
        : false,
      false
    >
  >,
]

DialogBinding.open()

// @ts-expect-error The relocated Dialog operation takes no arguments.
DialogBinding.open('unexpected')

PickerBinding.selectItem('Apple', 'Apple')

// @ts-expect-error The emitted generic operation rejects an unrelated item.
PickerBinding.selectItem('Banana', 'Banana')

Picker.Message.SelectedItem({
  // @ts-expect-error The emitted Message constructor keeps the refined payload.
  item: 'Banana',
  displayText: 'Banana',
  wasSelected: false,
})

WithViewAndOutMessage.replaceEffectsLayer(WithViewAndOutMessage.EffectsLayer)
WithOutMessageOnly.replaceEffectsLayer(WithOutMessageOnly.EffectsLayer)
WithViewOnly.replaceEffectsLayer(WithViewOnly.EffectsLayer)
WithoutViewOrOutMessage.replaceEffectsLayer(
  WithoutViewOrOutMessage.EffectsLayer,
)
