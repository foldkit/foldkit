import { Array, Option, Schema } from 'effect'
import { Block, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

type ViewInputs<Value extends string> = Readonly<{
  values: ReadonlyArray<Value>
}>

type ValueSchema<Value extends string> = Schema.Schema<Value> &
  Readonly<{ '~type.make': Value }>

const makeMessage = <Value extends string>(Value: ValueSchema<Value>) =>
  defineMessageUnion({ SelectedValue: { value: Value } })

const makeOutMessage = <Value extends string>(Value: ValueSchema<Value>) =>
  defineMessageUnion({ Selected: { value: Value } })

const Picker = Block.define('Picker')

export const make = <Value extends string>(Value: ValueSchema<Value>) => {
  const Model = Schema.Struct({ selected: Schema.Option(Value) })
  const Message = makeMessage(Value)
  const OutMessage = makeOutMessage(Value)
  const RefinedPicker = Picker.define({
    Model,
    Message,
    OutMessage,
  })
  const RefinedPickerComposition = RefinedPicker.makeComposition()

  const update = RefinedPickerComposition.makeUpdate((model, message) =>
    Message.match(message, {
      SelectedValue: ({ value }) => ({
        model: modifyFields(model, { selected: () => Option.some(value) }),
        outMessage: OutMessage.Selected({ value }),
      }),
    }),
  )

  const select = RefinedPicker.step((model, value: Value) =>
    update(model, Message.SelectedValue({ value })),
  )

  const view = RefinedPickerComposition.makeView.withInputs<ViewInputs<Value>>(
    (model, { values }, h) =>
      h.div(
        [],
        Array.prepend(
          Array.map(values, value =>
            h.keyed('button')(
              value,
              [h.OnClick(Message.SelectedValue({ value }))],
              [value],
            ),
          ),
          h.p([], [Option.getOrElse(model.selected, () => 'Choose a fruit')]),
        ),
      ),
  )

  const init = RefinedPickerComposition.makeInit(() => ({
    model: Model.make({ selected: Option.none() }),
  }))

  return RefinedPickerComposition.makeBlock({
    init,
    update,
    view,
    expose: { select },
  })
}

const Fruit = Schema.Literals(['Apple', 'Pear'])
const FruitPicker = make(Fruit)

const ParentModel = Schema.Struct({
  picker: FruitPicker.Model,
  selectionHistory: Schema.Array(Fruit),
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({
  GotPickerMessage: { message: FruitPicker.Message },
})

const FruitSelection = Block.define('FruitSelection', {
  Model: ParentModel,
  Message: ParentMessage,
})

const PickerBinding = FruitSelection.bindChild(FruitPicker, {
  field: 'picker',
  parentMessage: ParentMessage.GotPickerMessage,
  outMessage: {
    fold: FruitPicker.OutMessage.match<
      Update.Step<ParentModel, typeof ParentMessage.Type>
    >({
      Selected:
        ({ value }) =>
        model => ({
          model: modifyFields(model, {
            selectionHistory: Array.append(value),
          }),
        }),
    }),
  },
})

export const selectApple = PickerBinding.select('Apple')

const FruitSelectionComposition = FruitSelection.makeComposition({
  childBindings: [PickerBinding],
})

export const pickerView = FruitSelectionComposition.makeView((model, h) =>
  h.block(
    PickerBinding.embedView({
      slotId: 'fruit-picker',
      model: model.picker,
      viewInputs: { values: ['Apple', 'Pear'] },
    }),
  ),
)
