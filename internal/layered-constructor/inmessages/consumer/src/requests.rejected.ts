import { Effect } from 'effect'

import { MessageComposerBinding } from './chatRoom/composition'
import { MessageComposerBlock } from './messageComposer/block'
import { MessageComposerComposition } from './messageComposer/composition'
import { MessageComposerContract } from './messageComposer/definition'
import { InMessage } from './messageComposer/inMessage'
import { Message } from './messageComposer/message'

// @ts-expect-error A zero-payload input has no argument placeholder.
export const invalidClearPayload = MessageComposerBinding.requestClear({
  text: 'Hello',
})

// @ts-expect-error Receive must handle every declared input.
export const incompleteReceive = MessageComposerComposition.makeReceive({
  RequestedClear: model => ({ model }),
})

export const invalidDispatches = Effect.gen(function* () {
  const composer = yield* MessageComposerContract.get
  const composerInit = composer.init('rejected-composer')

  const localInput = composer.update(
    composerInit.model,
    // @ts-expect-error InMessages cannot enter the local update dispatcher.
    InMessage.RequestedClear(),
  )
  const receivedLocal = composer.receive(
    composerInit.model,
    // @ts-expect-error Local facts cannot enter receive.
    Message.UpdatedText({ value: 'Hello' }),
  )

  return { localInput, receivedLocal }
}).pipe(Effect.provide(MessageComposerBlock.layer))
