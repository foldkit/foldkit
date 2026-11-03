import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
export const ContextKey = Symbol('InputContexts')
const Model = Schema.Struct({
  value: Schema.Number,
  before: Schema.Array(Schema.Number),
})
export const Message = defineMessageUnion({
  UpdatedValue: { value: Schema.Number },
})
export const InMessage = defineMessageUnion({
  RequestedValue: { value: Schema.Number },
})
const Definition = Block.makeDefinition('InputContexts', {
  key: ContextKey,
  Model,
  Message,
  InMessage,
  Init: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.Number]),
  InMessageContext:
    Block.makeInputContract<
      readonly [label?: string, ...parts: ReadonlyArray<string>]
    >(),
})
const Composition = Definition.makeComposition()
const base = Composition.makeInMessageUpdate.withContext(
  (label = 'Default', ...parts: ReadonlyArray<string>) => ({
    RequestedValue: (model, { value }) => ({
      model: modifyFields(model, {
        value: () => value + label.length + parts.length,
      }),
    }),
  }),
)
export const inputBundle = Composition.makeInMessageUpdate.compose(
  Composition.makeInMessageUpdate.cases.withContext(
    (label = 'Default', ...parts: ReadonlyArray<string>) => ({
      RequestedValue: model => ({
        model: modifyFields(model, {
          value: value => value + label.length + parts.length,
        }),
      }),
    }),
  ),
  Composition.makeInMessageUpdate.each((model, _input, { before }) => ({
    model: modifyFields(model, { before: values => [...values, before.value] }),
  })),
)
export const ContextBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit(() => ({
      model: Model.make({ value: 0, before: [] }),
    })),
    update: Composition.makeUpdate.withContext((multiplier: number) => ({
      UpdatedValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value * multiplier }),
      }),
    })),
    inMessageUpdate: Composition.makeInMessageUpdate.compose(base, inputBundle),
  }),
)
