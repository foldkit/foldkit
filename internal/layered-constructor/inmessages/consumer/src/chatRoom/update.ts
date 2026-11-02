import { Array } from 'effect'

import { TimestampReceivedMessage } from './command'
import { ChatRoomComposition } from './composition'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './definition'
import { ChatMessage, ConnectionState } from './model'
import { disconnect, recordSentMessage } from './steps'

export const update = ChatRoomComposition.makeUpdate({
  ClickedConnect: makeFieldsStep(() => ({
    connection: () => ConnectionState.Connecting(),
  })),
  ClickedDisconnect: disconnect,
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
  SucceededSendMessage: makeStep.fromMessage(({ text }) =>
    recordSentMessage(text),
  ),
  ReceivedMessage: makeCommandsStep.fromMessage(({ text }) => [
    TimestampReceivedMessage({ text }),
  ]),
  TimestampedMessage: makeFieldsStep((model, { text, zoned, isSent }) => ({
    messages: Array.append(
      ChatMessage.make({ id: model.nextMessageId, text, zoned, isSent }),
    ),
    nextMessageId: id => id + 1,
  })),
})
