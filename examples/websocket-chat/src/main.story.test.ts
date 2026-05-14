import { DateTime } from 'effect'
import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ClickedConnect,
  Connected,
  ConnectionConnected,
  ConnectionConnecting,
  ConnectionDisconnected,
  Disconnected,
  FailedConnect,
  type Model,
  ReceivedMessage,
  SendMessage,
  SubmittedMessage,
  SucceededSendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
  TimestampedMessage,
  UpdatedMessageInput,
  update,
} from './main'

const idleModel: Model = {
  connection: ConnectionDisconnected(),
  messages: [],
  messageInput: '',
}

const connectedModel: Model = {
  ...idleModel,
  connection: ConnectionConnected(),
}

const zonedNow = DateTime.makeZonedUnsafe(0, { timeZone: 'UTC' })

describe('update', () => {
  describe('connection state', () => {
    test('ClickedConnect moves into ConnectionConnecting', () => {
      Story.story(
        update,
        Story.with(idleModel),
        Story.message(ClickedConnect()),
        Story.model(model => {
          expect(model.connection._tag).toBe('ConnectionConnecting')
        }),
      )
    })

    test('Connected moves into ConnectionConnected', () => {
      Story.story(
        update,
        Story.with({ ...idleModel, connection: ConnectionConnecting() }),
        Story.message(Connected()),
        Story.model(model => {
          expect(model.connection._tag).toBe('ConnectionConnected')
        }),
      )
    })

    test('Disconnected returns to ConnectionDisconnected and clears messages', () => {
      Story.story(
        update,
        Story.with({
          ...connectedModel,
          messages: [{ text: 'old', zoned: zonedNow, isSent: true }],
        }),
        Story.message(Disconnected()),
        Story.model(model => {
          expect(model.connection._tag).toBe('ConnectionDisconnected')
          expect(model.messages).toHaveLength(0)
        }),
      )
    })

    test('FailedConnect captures the error message', () => {
      Story.story(
        update,
        Story.with({ ...idleModel, connection: ConnectionConnecting() }),
        Story.message(FailedConnect({ error: 'Timeout' })),
        Story.model(model => {
          if (model.connection._tag === 'ConnectionError') {
            expect(model.connection.error).toBe('Timeout')
          } else {
            throw new Error('Expected ConnectionError')
          }
        }),
      )
    })
  })

  describe('message input', () => {
    test('UpdatedMessageInput stores the new input value', () => {
      Story.story(
        update,
        Story.with(connectedModel),
        Story.message(UpdatedMessageInput({ value: 'Hello' })),
        Story.model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      )
    })
  })

  describe('SubmittedMessage', () => {
    test('an empty input is ignored', () => {
      Story.story(
        update,
        Story.with({ ...connectedModel, messageInput: '' }),
        Story.message(SubmittedMessage()),
        Story.Command.expectNone(),
      )
    })

    test('whitespace-only input is ignored', () => {
      Story.story(
        update,
        Story.with({ ...connectedModel, messageInput: '   ' }),
        Story.message(SubmittedMessage()),
        Story.Command.expectNone(),
      )
    })

    test('connected client fires SendMessage and clears the input', () => {
      Story.story(
        update,
        Story.with({ ...connectedModel, messageInput: 'Hello there' }),
        Story.message(SubmittedMessage()),
        Story.model(model => {
          expect(model.messageInput).toBe('')
        }),
        Story.Command.expectHas(SendMessage),
        Story.Command.resolve(
          SendMessage,
          SucceededSendMessage({ text: 'Hello there' }),
        ),
        Story.Command.expectHas(TimestampSentMessage),
        Story.Command.resolve(
          TimestampSentMessage,
          TimestampedMessage({
            text: 'Hello there',
            zoned: zonedNow,
            isSent: true,
          }),
        ),
        Story.model(model => {
          expect(model.messages).toHaveLength(1)
          expect(model.messages[0]?.text).toBe('Hello there')
          expect(model.messages[0]?.isSent).toBe(true)
        }),
      )
    })

    test('disconnected client ignores SubmittedMessage', () => {
      Story.story(
        update,
        Story.with({ ...idleModel, messageInput: 'Hello' }),
        Story.message(SubmittedMessage()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      )
    })
  })

  describe('inbound messages', () => {
    test('ReceivedMessage queues TimestampReceivedMessage that appends to the list', () => {
      Story.story(
        update,
        Story.with(connectedModel),
        Story.message(ReceivedMessage({ text: 'echo' })),
        Story.Command.expectHas(TimestampReceivedMessage),
        Story.Command.resolve(
          TimestampReceivedMessage,
          TimestampedMessage({
            text: 'echo',
            zoned: zonedNow,
            isSent: false,
          }),
        ),
        Story.model(model => {
          expect(model.messages).toHaveLength(1)
          expect(model.messages[0]?.isSent).toBe(false)
          expect(model.messages[0]?.text).toBe('echo')
        }),
      )
    })
  })
})
