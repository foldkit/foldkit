import type * as Block from 'foldkit/block'

import {
  ChildInitContext,
  CodecService,
  InMessage,
  Message,
  Model,
  NativeComposition,
  OutMessage,
  ParentBlock,
  ServiceText,
} from './codec-contract.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

export type ModelDecodeIsSelfContained = Assert<
  Equal<typeof Model.DecodingServices, never>
>
export type ModelEncodeIsSelfContained = Assert<
  Equal<typeof Model.EncodingServices, never>
>
export type LocalMessageDecodeIsSelfContained = Assert<
  Equal<typeof Message.DecodingServices, never>
>
export type NativeMessageDecodeIsSelfContained = Assert<
  Equal<typeof NativeComposition.Message.DecodingServices, never>
>
export type NativeMessageEncodeIsSelfContained = Assert<
  Equal<typeof NativeComposition.Message.EncodingServices, never>
>
export type ServiceSchemaRetainsDecodeRequirement = Assert<
  Equal<typeof ServiceText.DecodingServices, CodecService>
>
export type NonserializedInMessageRetainsService = Assert<
  Equal<typeof InMessage.DecodingServices, CodecService>
>
export type NonserializedOutMessageRetainsService = Assert<
  Equal<typeof OutMessage.DecodingServices, CodecService>
>
export type NonserializedChildContextRetainsService = Assert<
  Equal<typeof ChildInitContext.DecodingServices, CodecService>
>
export type ParentFactsRemainSelfContained = Assert<
  Equal<Block.FactsOf<typeof ParentBlock>['decodingServices'], never>
>
