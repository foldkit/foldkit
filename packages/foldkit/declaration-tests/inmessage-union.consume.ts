import type * as Block from 'foldkit/block'

import {
  AlternativeContract,
  InMessage,
  InputBinding,
  InputContract,
  RequiredInMessage,
} from './inmessage-union.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

export type ExactRelocatedInMessage = Assert<
  Equal<
    typeof InMessage.Type,
    | Readonly<{ _tag: 'RequestedSet'; count: number }>
    | Readonly<{ _tag: 'InformedOfReset' }>
  >
>
export type ExactRelocatedRequest = Assert<
  Equal<
    typeof InMessage.RequestedSet.Type,
    Readonly<{ _tag: 'RequestedSet'; count: number }>
  >
>
export type ExactRelocatedDecodingServices = Assert<
  Equal<typeof RequiredInMessage.DecodingServices, 'DecodeInput'>
>
export type ExactRelocatedEncodingServices = Assert<
  Equal<typeof RequiredInMessage.EncodingServices, 'EncodeInput'>
>
export type ExactGeneratedOperationNames = Assert<
  Equal<
    keyof Block.FactsOf<typeof InputContract>['operations'],
    'requestSet' | 'informOfReset'
  >
>
export type ExactAlternativeGeneratedOperationNames = Assert<
  Equal<
    keyof Block.FactsOf<typeof AlternativeContract>['operations'],
    'requestAlternative'
  >
>

declare const input: Block.ExecutableOf<typeof InputContract>
input.operations.requestSet({ count: 0 }, { count: 1 })
input.operations.informOfReset({ count: 1 })

export const boundRequest = InputBinding.requestSet({ count: 1 })
export const boundInform = InputBinding.informOfReset()
