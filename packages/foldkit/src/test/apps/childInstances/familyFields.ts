import { Array, Context, Effect, Layer, Schema } from 'effect'

import { Block, Message } from '../../../index.js'

export class ValueFamily extends Context.Service<
  ValueFamily,
  Block.FamilyLifetime
>()('ChildInstances/ValueFamily') {}

const ValueFamilyLayer = Layer.effect(ValueFamily)(Block.familyLifetime)
export const ValueNamespace = Block.makeNamespace('InstanceValueFamily')
export const ValueKey = Symbol('InstanceValueFamily')
const makeValueFamily = <Value extends Schema.Codec<any, any, never, never>>(
  Value: Value,
) => {
  const Model = Schema.Struct({ value: Value })
  type Model = typeof Model.Type
  const Definition = Block.makeFamilyDefinition(ValueNamespace, {
    key: ValueKey,
    Model,
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([Model]),
  })
  const Composition = Definition.makeComposition()
  const recipe = Definition.makeBlock(
    Effect.succeed({
      children: [],
      init: Composition.makeInit(model => ({ model })),
      update: Composition.makeUpdate({}),
    }),
  )
  const block = Block.makeFamilyContract(Definition, ValueFamily, () => recipe)

  return { block, definition: Definition, recipe }
}

export const NumberFamily = makeValueFamily(Schema.Number)
export const StringFamily = makeValueFamily(Schema.String)
export const FamilyModel = Schema.Struct({
  numbers: Schema.Array(NumberFamily.block.Instance),
  strings: Schema.Array(StringFamily.block.Instance),
})
export type FamilyModel = typeof FamilyModel.Type
export const FamilyMessage = Message.defineMessageUnion({
  ClickedAddValues: {
    key: Schema.String,
    count: Schema.Number,
    label: Schema.String,
  },
})
export type FamilyMessage = typeof FamilyMessage.Type
const FamilyApplicationKey = Symbol('FamilyInstanceApplication')
export const FamilyDefinition = Block.makeDefinition(
  'FamilyInstanceApplication',
  {
    key: FamilyApplicationKey,
    Model: FamilyModel,
    Message: FamilyMessage,
    InitArgs: Schema.Tuple([]),
  },
)
export const NumbersBinding = FamilyDefinition.makeKeyedArrayBinding(
  NumberFamily.block,
  {
    field: 'numbers',
    placement: 'numbers',
    key: 'key',
    childField: 'model',
  },
)
export const StringsBinding = FamilyDefinition.makeKeyedArrayBinding(
  StringFamily.block,
  {
    field: 'strings',
    placement: 'strings',
    key: 'key',
    childField: 'model',
  },
)
const FamilyComposition = FamilyDefinition.makeComposition({
  bindings: [NumbersBinding, StringsBinding],
})
export const FamilyBlock = FamilyDefinition.makeBlock(
  Effect.gen(function* () {
    const numbers = yield* NumbersBinding
    const strings = yield* StringsBinding

    return {
      children: [numbers, strings],
      init: FamilyComposition.makeInit(() => ({
        model: { numbers: [], strings: [] },
      })),
      update: FamilyComposition.makeUpdate({
        ClickedAddValues: FamilyDefinition.makeFieldsStep.fromMessage(
          ({ key, count, label }) => ({
            numbers: Array.append(
              NumbersBinding.create({ key, args: [{ value: count }] }),
            ),
            strings: Array.append(
              StringsBinding.create({ key, args: [{ value: label }] }),
            ),
          }),
        ),
      }),
    }
  }),
).provide(ValueFamilyLayer)
