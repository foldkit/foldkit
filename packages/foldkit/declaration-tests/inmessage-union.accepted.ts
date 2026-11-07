import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({ ChangedCount: {} })
export type Message = typeof Message.Type

export const inMessageCases = {
  RequestedSet: { count: Schema.Number },
  InformedOfReset: {},
}
export const InMessage = defineInMessageUnion(inMessageCases)
export type InMessage = typeof InMessage.Type

export type ExactExtractedInMessage = Assert<
  Equal<
    InMessage,
    | Readonly<{ _tag: 'RequestedSet'; count: number }>
    | Readonly<{ _tag: 'InformedOfReset' }>
  >
>

export declare const RequiredValue: Schema.Codec<
  number,
  string,
  'DecodeInput',
  'EncodeInput'
>
export const RequiredInMessage = defineInMessageUnion({
  RequestedRequiredValue: { value: RequiredValue },
})
export type ExactDecodingServices = Assert<
  Equal<typeof RequiredInMessage.DecodingServices, 'DecodeInput'>
>
export type ExactEncodingServices = Assert<
  Equal<typeof RequiredInMessage.EncodingServices, 'EncodeInput'>
>

export const InputKey = Symbol('InMessageUnionInput')
export const InputDefinition = Block.makeDefinition('InMessageUnionInput', {
  key: InputKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([]),
})
export const InputContract = InputDefinition.contract
export type ExactGeneratedOperationNames = Assert<
  Equal<
    keyof Block.FactsOf<typeof InputContract>['operations'],
    'requestSet' | 'informOfReset'
  >
>
export type InputExecutable = Block.ExecutableOf<typeof InputContract>

export const AlternativeInMessage = defineMessageUnion({
  RequestedAlternative: { count: Schema.Number },
})
export const AlternativeKey = Symbol('InMessageUnionAlternative')
export const AlternativeDefinition = Block.makeDefinition(
  'InMessageUnionAlternative',
  {
    key: AlternativeKey,
    Model,
    Message,
    InMessage: AlternativeInMessage,
    InitArgs: Schema.Tuple([]),
  },
)
export const AlternativeContract = AlternativeDefinition.contract
export type ExactAlternativeGeneratedOperationNames = Assert<
  Equal<
    keyof Block.FactsOf<typeof AlternativeContract>['operations'],
    'requestAlternative'
  >
>

export const ParentModel = Schema.Struct({ input: InputContract.Model })
export type ParentModel = typeof ParentModel.Type
export const ParentMessage = defineMessageUnion({
  ClickedSet: {},
  ClickedReset: {},
})
export const ParentKey = Symbol('InMessageUnionParent')
export const ParentDefinition = Block.makeDefinition('InMessageUnionParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  InitArgs: Schema.Tuple([]),
})
export const InputBinding = ParentDefinition.makeRequiredFieldBinding(
  InputContract,
  {
    field: 'input',
  },
)
export const requestSet = InputBinding.requestSet({ count: 2 })
export const informOfReset = InputBinding.informOfReset()
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [InputBinding],
})
export const parentUpdate = ParentComposition.makeUpdate({
  ClickedSet: requestSet,
  ClickedReset: informOfReset,
})
