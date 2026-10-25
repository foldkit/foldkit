import { Match, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { ApplicationComposition } from './composition'
import { ApplicationDefinition } from './definition'
import { ChatMessage, ConnectionState } from './model'

export const update = ApplicationComposition.makeUpdate({
  ClickedConnect: ApplicationDefinition.makeFieldsStep(() => ({
    connection: () => ConnectionState.Connecting(),
  })),

  ConnectedChatSocket: ApplicationDefinition.makeFieldsStep(() => ({
    connection: () => ConnectionState.Connected(),
  })),

  DisconnectedChatSocket: ApplicationDefinition.makeFieldsStep(() => ({
    connection: () => ConnectionState.Disconnected(),
    messages: () => [],
  })),

  ReleasedChatSocket: ApplicationDefinition.makeNoopStep(),

  FailedConnectChatSocket: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      connection: () => ConnectionState.Error({ error }),
    }),
  ),

  FailedChatSocket: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      connection: () => ConnectionState.Error({ error }),
    }),
  ),

  FailedSendMessage: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      connection: () => ConnectionState.Error({ error }),
    }),
  ),

  UpdatedMessageInput: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({
      messageInput: () => value,
    }),
  ),

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

  SucceededSendMessage: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ text }) => [TimestampSentMessage({ text })],
  ),

  ReceivedMessage: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ text }) => [TimestampReceivedMessage({ text })],
  ),

  TimestampedMessage: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ text, zoned, isSent }) => {
      const newMessage = ChatMessage.make({ text, zoned, isSent })

      return {
        messages: messages => [...messages, newMessage],
      }
    },
  ),
})
