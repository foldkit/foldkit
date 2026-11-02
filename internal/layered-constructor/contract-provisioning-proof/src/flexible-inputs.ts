import { Effect, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({ Cleared: {} })
const FlexibleInputs = Schema.TupleWithRest(
  Schema.Tuple([Schema.optionalKey(Schema.String)]),
  [Schema.Number],
)
export const ContractFlexibleInputsKey = Symbol('ContractFlexibleInputs')
const Definition = Contracted.makeDefinition('ContractFlexibleInputs', {
  key: ContractFlexibleInputsKey,
  Model,
  Message,
  Init: FlexibleInputs,
  Context: FlexibleInputs,
  operations: { clear: Message.Cleared },
})
const Composition = Definition.makeComposition()
export const FlexibleBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit((prefix = 'Initial', ...values) => ({
      model: { value: `${prefix}: ${values.length}` },
    })),
    update: Composition.makeUpdate.withContext(
      (prefix = 'Context', ...values) => ({
        Cleared: Definition.makeFieldsStep(() => ({
          value: () => `${prefix}: ${values.length}`,
        })),
      }),
    ),
  }),
)

Effect.gen(function* () {
  const block = yield* FlexibleBlock.get
  const initial = block.init()
  block.init('Initial', 1, 2, 3)
  block.update(initial.model, Message.Cleared())
  block.update(Message.Cleared())(initial.model, 'Direct', 1, 2)
  block.operations.clear(initial.model)
  block.operations.clear(initial.model, 'Operation', 1, 2)
  // @ts-expect-error The optional prefix retains its string type.
  block.init(1)
  // @ts-expect-error Rest arguments retain their numeric type.
  block.operations.clear(initial.model, 'Operation', 'Wrong')
})
