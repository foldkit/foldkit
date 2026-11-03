import { Effect, Layer } from 'effect'
import { Socket } from 'effect/socket'
import type * as Block from 'foldkit/block'

import { MessageComposerBinding } from './chatRoom/composition'
import { ChatRoomContract } from './chatRoom/definition'
import { MessageComposerBlock } from './messageComposer/block'
import { MessageComposerContract } from './messageComposer/definition'
import { InMessage } from './messageComposer/inMessage'
import { Message } from './messageComposer/message'
import { OutMessage } from './messageComposer/outMessage'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const receivedRequests = Effect.gen(function* () {
  const composer = yield* MessageComposerContract.get
  const composerInit = composer.init('typed-composer')
  const updated = composer.update(
    composerInit.model,
    Message.UpdatedText({ value: '  Hello  ' }),
  )
  const submitted = composer.inMessageUpdate(
    updated.model,
    InMessage.RequestedSubmit(),
  )
  const cleared = composer.inMessageUpdate(
    submitted.model,
    InMessage.RequestedClear(),
  )
  const locallySubmitted = composer.update(
    updated.model,
    Message.SubmittedForm(),
  )

  return { cleared, submitted, locallySubmitted }
}).pipe(Effect.provide(MessageComposerBlock.layer))

export const extractedClear = MessageComposerBinding.requestClear()
export const extractedSubmit = MessageComposerBinding.requestSubmit()

export type RequestAssertions = [
  Expect<Equal<Parameters<typeof MessageComposerBinding.requestClear>, []>>,
  Expect<Equal<Parameters<typeof MessageComposerBinding.requestSubmit>, []>>,
  Expect<
    Equal<
      Exclude<
        Effect.Success<typeof receivedRequests>['cleared']['outMessage'],
        undefined
      >,
      never
    >
  >,
  Expect<
    Equal<
      Exclude<
        Effect.Success<typeof receivedRequests>['submitted']['outMessage'],
        undefined
      >,
      typeof OutMessage.Submitted.Type
    >
  >,
  Expect<Equal<Effect.Services<typeof receivedRequests>, never>>,
  Expect<Equal<Layer.Services<typeof MessageComposerBlock.layer>, never>>,
  Expect<
    Equal<
      Block.FactsOf<typeof ChatRoomContract>['programRequirements'],
      Socket.WebSocketConstructor
    >
  >,
]
