import { Array, Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import * as BlockFamily from 'foldkit/internal/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

type ViewInputs<Value extends string> = Readonly<{
  values: ReadonlyArray<Value>
}>

type ValueSchema<Value extends string> = Schema.Codec<Value, Value> &
  Readonly<{ '~type.make': Value }>

const PickerNamespace = Block.makeNamespace('Picker')
export const PickerKey = Symbol('Picker')

const definePicker = <Value extends string>(Value: ValueSchema<Value>) => {
  const Model = Schema.Struct({ selected: Schema.Option(Value) })
  type Model = typeof Model.Type
  const Message = defineMessageUnion({
    SelectedValue: { value: Value },
    RequestedSelectValue: { value: Value },
  })
  const OutMessage = defineMessageUnion({ Selected: { value: Value } })

  const PickerDefinition = BlockFamily.makeFamilyDeclaration(PickerNamespace, {
    key: PickerKey,
    Model,
    Message,
    OutMessage,
    InitArgs: Schema.Tuple([]),
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

type PickerAuthoring<Value extends string> = ReturnType<
  typeof definePicker<Value>
>

const constructPicker = <Value extends string>({
  PickerDefinition,
  init,
  update,
  view,
}: PickerAuthoring<Value>) =>
  PickerDefinition.makeLayer(
    Effect.gen(function* () {
      return {
        children: [],
        init,
        update,
        view,
      }
    }),
  )

interface PickerImplementation extends Block.FamilyLifetime {
  readonly construct: typeof constructPicker
}

class PickerFamily extends Context.Service<
  PickerFamily,
  PickerImplementation
>()('PickerFamily') {}

// One provider constructs every Schema specialization under the shared identity.
export const layer = Layer.effect(PickerFamily)(
  Effect.gen(function* () {
    const lifetime = yield* Block.familyLifetime

    return { ...lifetime, construct: constructPicker }
  }),
)

export const makeBlock = <Value extends string>(Value: ValueSchema<Value>) => {
  const authoring = definePicker(Value)

  return BlockFamily.resolveFamily(
    authoring.PickerDefinition,
    PickerFamily,
    implementation => implementation.construct(authoring),
  )
}
