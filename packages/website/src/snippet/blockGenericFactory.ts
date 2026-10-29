import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

type ViewInputs<Value extends string> = Readonly<{
  values: ReadonlyArray<Value>
}>

type ValueSchema<Value extends string> = Schema.Schema<Value> &
  Readonly<{ '~type.make': Value }>

const makeMessage = <Value extends string>(Value: ValueSchema<Value>) =>
  defineMessageUnion({
    SelectedValue: { value: Value },
    RequestedSelectValue: { value: Value },
  })

const makeOutMessage = <Value extends string>(Value: ValueSchema<Value>) =>
  defineMessageUnion({ Selected: { value: Value } })

const PickerNamespace = Block.makeNamespace('Picker')

export const make = <Value extends string>(Value: ValueSchema<Value>) => {
  const Model = Schema.Struct({ selected: Schema.Option(Value) })
  type Model = typeof Model.Type
  const Message = makeMessage(Value)
  const OutMessage = makeOutMessage(Value)
  const RefinedPickerDefinition = PickerNamespace.makeDefinition({
    Model,
    Message,
    OutMessage,
  })
  const RefinedPickerComposition = RefinedPickerDefinition.makeComposition()

  const selectValueStep = RefinedPickerDefinition.makeStep(
    (model, value: Value) => ({
      model: modifyFields(model, { selected: () => Option.some(value) }),
      outMessage: OutMessage.Selected({ value }),
    }),
  )

  const update = RefinedPickerComposition.makeUpdate({
    SelectedValue: (model, { value }) => selectValueStep(model, value),
    RequestedSelectValue: (model, { value }) => selectValueStep(model, value),
  })

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

  const prepare = () =>
    RefinedPickerComposition.prepareBlock({
      init,
      update,
      view,
      operations: {
        requestSelectValue: (value: Value) => [
          Message.RequestedSelectValue({ value }),
        ],
      },
    })

  const PickerBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return PickerBlock
}

const Fruit = Schema.Literals(['Apple', 'Pear'])
type Fruit = typeof Fruit.Type

const FruitPicker = make(Fruit)

const ParentModel = Schema.Struct({
  picker: FruitPicker.Model,
  selectionHistory: Schema.Array(Fruit),
})
type ParentModel = typeof ParentModel.Type

const ParentMessage = defineMessageUnion({})
type ParentMessage = typeof ParentMessage.Type

const FruitSelectionDefinition = Block.makeDefinition('FruitSelection', {
  Model: ParentModel,
  Message: ParentMessage,
})

const PickerBinding = FruitSelectionDefinition.makeBinding(FruitPicker, {
  field: 'picker',
}).withOutMessagePolicy({
  fold: FruitSelectionDefinition.makeOutMessageFold(FruitPicker, {
    Selected: ({ value }) =>
      FruitSelectionDefinition.makeFieldsStep(() => ({
        selectionHistory: Array.append(value),
      })),
  }),
})

export const selectAppleStep = PickerBinding.requestSelectValue('Apple')

const FruitSelectionComposition = FruitSelectionDefinition.makeComposition({
  bindings: [PickerBinding],
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
