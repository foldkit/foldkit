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
