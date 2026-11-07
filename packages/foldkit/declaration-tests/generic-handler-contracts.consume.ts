import { Schema } from 'effect'
import * as Block from 'foldkit/block'

import {
  City,
  OptionalEffectsBlock,
  OptionalViewBlock,
  makeEchoBlock,
} from './generic-handler-contracts.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

type Expect<Value extends true> = Value

const Color = Schema.Literals(['Red', 'Blue'])
export const ColorBlock = makeEchoBlock(Color)

export type CompletedEchoPayloadIsExact = Expect<
  Equal<
    Extract<typeof ColorBlock.Message.Type, { _tag: 'CompletedEcho' }>['value'],
    typeof Color.Type
  >
>
export type InitArgumentsAreExact = Expect<
  Equal<Parameters<typeof ColorBlock.init>, [id: string]>
>

const ParentDefinition = Block.makeDefinition(
  'DeclarationGenericHandlerParent',
  {
    Model: Schema.Struct({ child: ColorBlock.Model }),
    Message: Schema.Never,
  },
)
export const ColorBinding = ParentDefinition.makeRequiredFieldBinding(
  ColorBlock,
  {
    field: 'child',
    init: { contextToArgs: () => ['color'] },
  },
)

export type OptionalViewPayloadIsExact = Expect<
  Equal<
    Extract<
      typeof OptionalViewBlock.Message.Type,
      { _tag: 'CompletedEcho' }
    >['value'],
    typeof City.Type
  >
>
export type OptionalEffectsInitArgumentsAreExact = Expect<
  Equal<Parameters<typeof OptionalEffectsBlock.init>, [id: string]>
>
