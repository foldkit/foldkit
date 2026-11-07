import { DateTime, Effect, Schema } from 'effect'

import { makeCommand } from './block'
import { ChatSocket } from './chatSocket'
import { Message } from './message'

const getZonedTime = DateTime.now.pipe(
  Effect.map(utc => DateTime.setZone(utc, DateTime.zoneMakeLocal())),
)

export const TimestampSentMessage = makeCommand('TimestampSentMessage', {
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
})

export const TimestampReceivedMessage = makeCommand(
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

export const SendMessage = makeCommand('SendMessage', {
  args: { text: Schema.String },
  messages: [Message.SucceededSendMessage, Message.FailedSendMessage],
  handler: function* () {
    return ({ text }) =>
      ChatSocket.get.pipe(
        Effect.flatMap(connection =>
          connection.writer
            .write(text)
            .pipe(Effect.as(Message.SucceededSendMessage({ text }))),
        ),
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(
            Message.FailedSendMessage({ error: 'Socket unavailable' }),
          ),
        ),
        Effect.catch(error =>
          Effect.succeed(Message.FailedSendMessage({ error: error.message })),
        ),
      )
  },
})
