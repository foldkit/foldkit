import { Array, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { layer as PickerLayer, makeBlock } from './blockGenericFactory'

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitPicker = makeBlock(Fruit)
const ParentModel = Schema.Struct({
  picker: FruitPicker.Model,
  selectionHistory: Schema.Array(Fruit),
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({})
type ParentMessage = typeof ParentMessage.Type

export const FruitSelectionKey = Symbol('FruitSelection')
export const FruitSelectionBlock = Block.make('FruitSelection', {
  key: FruitSelectionKey,
  Model: ParentModel,
  Message: ParentMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const {
  makeFieldsStep,
  makeRequiredFieldBinding,
  makeOutMessageFold,
  makeComposition,
} = FruitSelectionBlock

const PickerBinding = makeRequiredFieldBinding(FruitPicker, {
  field: 'picker',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(FruitPicker, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ selectionHistory: Array.append(value) })),
  }),
})

export const selectApple = PickerBinding.requestSelectValue('Apple')

const FruitSelectionComposition = makeComposition({
  bindings: [PickerBinding],
})
const init = FruitSelectionComposition.makeInit(() => ({
  model: { selectionHistory: [] },
}))
const update = FruitSelectionComposition.makeUpdate({})
const view = FruitSelectionComposition.makeView((model, h) =>
  h.block(
    PickerBinding.embedView({
      slotId: 'fruit-picker',
      model: model.picker,
      viewInputs: { values: ['Apple', 'Pear'] },
    }),
  ),
)

export const layer = FruitSelectionBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(PickerLayer))
