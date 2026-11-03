import { Schema } from 'effect'
import * as Block from 'foldkit/block'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const MessageComposerKey = Symbol('MessageComposer')
export const MessageComposerDefinition = Block.makeDefinition(
  'MessageComposer',
  {
    key: MessageComposerKey,
    Model,
    Message,
    OutMessage,
    Init: Schema.Tuple([Schema.String]),
    view: { kind: 'Element' },
    operations: {
      requestClear: Message.RequestedClear,
      requestSubmit: {
        message: Message.SubmittedForm,
        outMessage: OutMessage.Submitted,
      },
    },
  },
)

export const MessageComposerContract = MessageComposerDefinition.contract

export const { makeFieldsStep, makeNoopStep } = MessageComposerDefinition
