import { Match, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { ApplicationComposition } from './composition'
import { makeCommandsStep, makeFieldsStep, makeNoopStep } from './definition'
import { ChatMessage, ConnectionState } from './model'

export const update = ApplicationComposition.makeUpdate({
  ClickedConnect: makeFieldsStep(() => ({
    connection: () => ConnectionState.Connecting(),
  })),

  ConnectedChatSocket: makeFieldsStep(() => ({
    connection: () => ConnectionState.Connected(),
  })),

  DisconnectedChatSocket: makeFieldsStep(() => ({
    connection: () => ConnectionState.Disconnected(),
    messages: () => [],
  })),

  ReleasedChatSocket: makeNoopStep(),

  FailedConnectChatSocket: makeFieldsStep.fromMessage(({ error }) => ({
    connection: () => ConnectionState.Error({ error }),
  })),

  FailedChatSocket: makeFieldsStep.fromMessage(({ error }) => ({
    connection: () => ConnectionState.Error({ error }),
  })),

  FailedSendMessage: makeFieldsStep.fromMessage(({ error }) => ({
    connection: () => ConnectionState.Error({ error }),
  })),

  UpdatedMessageInput: makeFieldsStep.fromMessage(({ value }) => ({
    messageInput: () => value,
  })),

  SubmittedMessage: model => {
    const trimmedMessage = model.messageInput.trim()

    if (String.isEmpty(trimmedMessage)) {
      return { model }
    }

    return Match.value(model.connection).pipe(
      Match.tag('Connected', () => ({
        model: modifyFields(model, {
          messageInput: () => '',
        }),
        commands: [SendMessage({ text: trimmedMessage })],
      })),
      Match.orElse(() => ({ model })),
    )
  },

  SucceededSendMessage: makeCommandsStep.fromMessage(({ text }) => [
    TimestampSentMessage({ text }),
  ]),

  ReceivedMessage: makeCommandsStep.fromMessage(({ text }) => [
    TimestampReceivedMessage({ text }),
  ]),

  TimestampedMessage: makeFieldsStep.fromMessage(({ text, zoned, isSent }) => {
    const newMessage = ChatMessage.make({ text, zoned, isSent })

    return {
      messages: messages => [...messages, newMessage],
    }
  }),
})
