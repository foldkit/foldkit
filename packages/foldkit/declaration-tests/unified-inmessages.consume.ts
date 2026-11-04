import type { Effect, Layer } from 'effect'
import type * as Block from 'foldkit/block'
import type { TestBlock } from 'foldkit/story'

import {
  CounterBlock,
  InMessage,
  Message,
  Store,
  acquiredInput,
  scenario,
  subject,
} from './unified-inmessages.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
type Counter = TestBlock<typeof subject>
type DeclaredCounter = Block.ExecutableOf<typeof CounterBlock>

export type ExactInputSchema = Assert<
  Equal<Counter['InMessage'], typeof InMessage>
>
export type ExactInputContext = Assert<
  Equal<Parameters<Counter['inMessageUpdate']>[2], number>
>
export type ExactLocalContext = Assert<
  Equal<Parameters<Counter['update']>[2], string>
>
export type ExactDeclaredMessage = Assert<
  Equal<
    Extract<DeclaredCounter['Message']['Type'], { _tag: 'CompletedSave' }>,
    typeof Message.CompletedSave.Type
  >
>
export type ExactHandlerService = Assert<
  Equal<Layer.Services<Counter['EffectsLayer']>, Store>
>
export type PureStoryNeedsNoHandlerService = Assert<
  Equal<Effect.Services<ReturnType<typeof scenario>>, never>
>
export type ScopedInputNeedsNoHandlerService = Assert<
  Equal<Effect.Services<typeof acquiredInput>, never>
>
