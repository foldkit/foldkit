import { DateTime, Effect, Schema } from 'effect'

import { ChatSocket } from './chatSocket'
import { ChatRoomDefinition } from './definition'
import { Message } from './message'

const getZonedTime = DateTime.now.pipe(
  Effect.map(utc => DateTime.setZone(utc, DateTime.zoneMakeLocal())),
)

export const TimestampSentMessage = ChatRoomDefinition.makeCommand(
  'TimestampSentMessage',
  {
    args: { text: Schema.String },
    messages: [Message.TimestampedMessage],
    handler: function* () {
      return ({ text }) =>
        getZonedTime.pipe(
          Effect.map(zoned =>
            Message.TimestampedMessage({ text, zoned, isSent: true }),
          ),
        )
    },
  },
)

export const TimestampReceivedMessage = ChatRoomDefinition.makeCommand(
  'TimestampReceivedMessage',
  {
    args: { text: Schema.String },
    messages: [Message.TimestampedMessage],
    handler: function* () {
      return ({ text }) =>
        getZonedTime.pipe(
          Effect.map(zoned =>
            Message.TimestampedMessage({ text, zoned, isSent: false }),
          ),
        )
    },
  },
)

export const SendMessage = ChatRoomDefinition.makeCommand('SendMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendMessage, Message.FailedSendMessage],
  handler: function* () {
    return ({ text }) =>
      ChatSocket.get.pipe(
        Effect.flatMap(socket =>
          Effect.try({
            try: () => {
              socket.send(text)
              return Message.SucceededSendMessage({ text })
            },
            catch: error =>
              error instanceof Error ? error.message : 'Failed to send message',
          }),
        ),
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(
            Message.FailedSendMessage({ error: 'Socket unavailable' }),
          ),
        ),
        Effect.catch(error =>
          Effect.succeed(Message.FailedSendMessage({ error })),
        ),
      )
  },
})
