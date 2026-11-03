import { Array, Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

type ViewInputs<Value extends string> = Readonly<{
  values: ReadonlyArray<Value>
}>

type ValueSchema<Value extends string> = Schema.Codec<Value, Value> &
  Readonly<{ '~type.make': Value }>

const PickerNamespace = Block.makeNamespace('Picker')
const PickerKey = Symbol('Picker')

const definePicker = <Value extends string>(Value: ValueSchema<Value>) => {
  const Model = Schema.Struct({ selected: Schema.Option(Value) })
  type Model = typeof Model.Type
  const Message = defineMessageUnion({
    SelectedValue: { value: Value },
    RequestedSelectValue: { value: Value },
  })
  const OutMessage = defineMessageUnion({ Selected: { value: Value } })

  const PickerDefinition = Block.makeFamilyDefinition(PickerNamespace, {
    key: PickerKey,
    Model,
    Message,
    OutMessage,
    Init: Schema.Tuple([]),
    view: {
      kind: 'Element',
      Inputs: Block.makeInputContract<ViewInputs<Value>>(),
    },
    operations: {
      requestSelectValue: {
        message: (value: Value) =>
          Tuple.make(Message.RequestedSelectValue({ value })),
        outMessage: OutMessage.Selected,
      },
    },
  })
  const PickerComposition = PickerDefinition.makeComposition()
  const { makeStep } = PickerDefinition

  const selectValue = makeStep((model, value: Value) => ({
    model: modifyFields(model, { selected: () => Option.some(value) }),
    outMessage: OutMessage.Selected({ value }),
  }))

  const update = PickerComposition.makeUpdate({
    SelectedValue: (model, { value }) => selectValue(model, value),
    RequestedSelectValue: (model, { value }) => selectValue(model, value),
  })
  const view = PickerComposition.makeView.withInputs<ViewInputs<Value>>(
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
  const init = PickerComposition.makeInit(() => ({
    model: Model.make({ selected: Option.none() }),
  }))

  return { PickerDefinition, init, update, view }
}

type PickerRuntime<Value extends string> = ReturnType<
  typeof definePicker<Value>
>

interface PickerConstructor {
  <Value extends string>(
    runtime: PickerRuntime<Value>,
  ): Block.FamilyRecipe<
    Block.FamilyContractOf<PickerRuntime<Value>['PickerDefinition']>
  >
}

interface PickerImplementation extends Block.FamilyLifetime {
  readonly construct: PickerConstructor
}

class PickerFamily extends Context.Service<
  PickerFamily,
  PickerImplementation
>()('PickerFamily') {}

const constructPicker: PickerConstructor = ({
  PickerDefinition,
  init,
  update,
  view,
}) =>
  PickerDefinition.makeBlock(
    Effect.gen(function* () {
      return {
        children: [],
        init,
        update,
        view,
      }
    }),
  )

// One provider constructs every Schema specialization under the shared identity.
export const layer = Layer.effect(PickerFamily)(
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct: constructPicker }
  }),
)

export const makeBlock = <Value extends string>(Value: ValueSchema<Value>) => {
  const runtime = definePicker(Value)

  return Block.makeFamilyContract(
    runtime.PickerDefinition,
    PickerFamily,
    implementation => implementation.construct(runtime),
  )
}

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

const FruitSelectionKey = Symbol('FruitSelection')

const FruitSelectionDefinition = Block.makeDefinition('FruitSelection', {
  key: FruitSelectionKey,
  Model: ParentModel,
  Message: ParentMessage,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeFieldsStep } = FruitSelectionDefinition

const PickerBinding = FruitSelectionDefinition.makeBinding(FruitPicker, {
  field: 'picker',
}).withOutMessagePolicy({
  fold: FruitSelectionDefinition.makeOutMessageFold(FruitPicker, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ selectionHistory: Array.append(value) })),
  }),
})

export const selectApple = PickerBinding.requestSelectValue('Apple')

const FruitSelectionComposition = FruitSelectionDefinition.makeComposition({
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

export const ApplicationBlock = FruitSelectionDefinition.makeBlock(
  Effect.gen(function* () {
    const picker = yield* PickerBinding

    return {
      children: [picker],
      init,
      update,
      view,
    }
  }),
).provide(layer)
