import { Match, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { ApplicationComposition } from './composition'
import { Message } from './message'
import { ChatMessage, ConnectionState } from './model'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedConnect: () => ({
      model: modifyFields(model, {
        connection: () => ConnectionState.Connecting(),
      }),
    }),

    ConnectedChatSocket: () => ({
      model: modifyFields(model, {
        connection: () => ConnectionState.Connected(),
      }),
    }),

    DisconnectedChatSocket: () => ({
      model: modifyFields(model, {
        connection: () => ConnectionState.Disconnected(),
        messages: () => [],
      }),
    }),

    ReleasedChatSocket: () => ({ model }),

    FailedConnectChatSocket: ({ error }) => ({
      model: modifyFields(model, {
        connection: () => ConnectionState.Error({ error }),
      }),
    }),

    FailedChatSocket: ({ error }) => ({
      model: modifyFields(model, {
        connection: () => ConnectionState.Error({ error }),
      }),
    }),

    FailedSendMessage: ({ error }) => ({
      model: modifyFields(model, {
        connection: () => ConnectionState.Error({ error }),
      }),
    }),

    UpdatedMessageInput: ({ value }) => ({
      model: modifyFields(model, {
        messageInput: () => value,
      }),
    }),

    SubmittedMessage: () => {
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

    SucceededSendMessage: ({ text }) => ({
      model,
      commands: [TimestampSentMessage({ text })],
    }),

    ReceivedMessage: ({ text }) => ({
      model,
      commands: [TimestampReceivedMessage({ text })],
    }),

    TimestampedMessage: ({ text, zoned, isSent }) => {
      const newMessage = ChatMessage.make({ text, zoned, isSent })

      return {
        model: modifyFields(model, {
          messages: messages => [...messages, newMessage],
        }),
      }
    },
  }),
)
