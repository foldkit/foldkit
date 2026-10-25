import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({
  RequestedIncrement: { amount: Schema.Number },
})
const Definition = Block.makeDefinition('FocusedStepExplicitAnyLimitation', {
  Model,
  Message,
})

const requiresMissingPayload = (
  model: typeof Model.Type,
  message: typeof Message.RequestedIncrement.Type &
    Readonly<{ missingPayload: number }>,
) => ({ count: () => model.count + message.missingPayload })

export const explicitAnyExactMessage = Definition.makeFieldsStep<
  any,
  typeof requiresMissingPayload
>(requiresMissingPayload)
