import type { Effect } from 'effect'
import type * as Block from 'foldkit/block'

import {
  ApplicationBlock,
  DispatchDecoder,
  DispatchEncoder,
  EditorBlock,
  decoding,
  dispatchProgram,
  encoding,
  quietProgram,
  suppliedDispatchProgram,
} from './codec-contract.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
type ProgramRequirements<Program> =
  Program extends Readonly<{
    '~foldkit/ProgramProvision'?: Readonly<{
      Requirements: (requirements: infer Requirements) => unknown
    }>
  }>
    ? Requirements
    : never

export type LocalSchemaDecoderIsInferred = Assert<
  Equal<Block.FactsOf<typeof EditorBlock>['decodingServices'], DispatchDecoder>
>
export type LocalSchemaEncoderIsInferred = Assert<
  Equal<Block.FactsOf<typeof EditorBlock>['encodingServices'], DispatchEncoder>
>
export type OpaqueChildDecoderIsDeclared = Assert<
  Equal<
    Block.FactsOf<typeof ApplicationBlock>['decodingServices'],
    DispatchDecoder
  >
>
export type OpaqueChildEncoderIsDeclared = Assert<
  Equal<
    Block.FactsOf<typeof ApplicationBlock>['encodingServices'],
    DispatchEncoder
  >
>
export type CompleteDecodeRequiresService = Assert<
  Equal<Effect.Services<typeof decoding>, DispatchDecoder>
>
export type CompleteEncodeRequiresService = Assert<
  Equal<Effect.Services<typeof encoding>, DispatchEncoder>
>
export type DevToolsDispatchRequiresDecoder = Assert<
  Equal<ProgramRequirements<typeof dispatchProgram>, DispatchDecoder>
>
export type OrdinaryProgramNeedsNoCodecServices = Assert<
  Equal<ProgramRequirements<typeof quietProgram>, never>
>
export type SuppliedDispatchClosesDecoder = Assert<
  Equal<ProgramRequirements<typeof suppliedDispatchProgram>, never>
>
