import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({
  count: Schema.Number,
  label: Schema.String,
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  Shared: { count: Schema.Number },
  CompletedSave: {},
})
export type Message = typeof Message.Type
export const InMessage = defineMessageUnion({
  Shared: { label: Schema.String },
  RequestSave: { count: Schema.Number },
  RequestReport: { label: Schema.String },
  RequestSet: { count: Schema.Number },
  RequestClose: {},
})
export type InMessage = typeof InMessage.Type
export const OutMessage = defineMessageUnion({
  Reported: { label: Schema.String },
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type

export const HelperInputsDefinition = Block.makeDefinition('HelperInputs', {
  Model,
  Message,
  OutMessage,
})
export const { makeNoopStep } = HelperInputsDefinition
export const Save = HelperInputsDefinition.makeCommand('Save', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSave],
})
const InputOnlyDefinition = Block.makeDefinition('HelperInputOnly', {
  Model,
  Message: InMessage,
})
export const SendInput = InputOnlyDefinition.makeCommand('SendInput', {
  messages: [InMessage.RequestClose],
})

export declare const makeStep: Block.DefineStep<
  Model,
  Message,
  OutMessage,
  Message | InMessage
>
export declare const makeFieldsStep: Block.DefineStepFields<
  Model,
  Message,
  Message | InMessage
>
export declare const makeCommandsStep: Block.MakeCommandsStep<
  Model,
  Message,
  Message | InMessage
>
export declare const makeOutMessageStep: Block.MakeOutMessageStep<
  Model,
  Message,
  OutMessage,
  Message | InMessage
>

type InputCases = {
  readonly [Tag in InMessage['_tag']]: ((
    model: Model,
    message: Extract<InMessage, Readonly<{ _tag: Tag }>>,
  ) => unknown) &
    Readonly<{
      __blockStepContext?: (
        message: Extract<InMessage, Readonly<{ _tag: Tag }>>,
      ) => void
    }>
}
export declare const acceptInputCases: <const Cases extends InputCases>(
  cases: Cases,
) => Cases
