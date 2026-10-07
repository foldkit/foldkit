import { DateTime } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import {
  ConnectionState,
  Message,
  type Model,
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
  update,
} from './main'

const idleModel: Model = {
  connection: ConnectionState.Disconnected(),
  messages: [],
  messageInput: '',
}

const connectedModel: Model = modifyFields(idleModel, {
  connection: () => ConnectionState.Connected(),
})

const zonedNow = DateTime.makeZonedUnsafe(0, { timeZone: 'UTC' })

describe('update', () => {
  describe('connection state', () => {
    test('ClickedConnect moves into Connecting', () => {
      story(
        update,
        given(idleModel),
        message(Message.ClickedConnect()),
        model(model => {
          expect(model.connection._tag).toBe('Connecting')
        }),
      )
    })

    test('ConnectedChatSocket moves into Connected', () => {
      story(
        update,
        given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connecting(),
          }),
        ),
        message(Message.ConnectedChatSocket()),
        model(model => {
          expect(model.connection._tag).toBe('Connected')
        }),
      )
    })

    test('DisconnectedChatSocket returns to Disconnected and clears messages', () => {
      story(
        update,
        given(
          modifyFields(connectedModel, {
            messages: () => [{ text: 'old', zoned: zonedNow, isSent: true }],
          }),
        ),
        message(Message.DisconnectedChatSocket()),
        model(model => {
          expect(model.connection._tag).toBe('Disconnected')
          expect(model.messages).toHaveLength(0)
        }),
      )
    })

    test('FailedConnectChatSocket captures the error message', () => {
      story(
        update,
        given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connecting(),
          }),
        ),
        message(Message.FailedConnectChatSocket({ error: 'Timeout' })),
        model(model => {
          if (model.connection._tag === 'Error') {
            expect(model.connection.error).toBe('Timeout')
          } else {
            throw new Error('Expected Error')
          }
        }),
      )
    })

    test('releasing the socket preserves a connection error', () => {
      story(
        update,
        given(connectedModel),
        message(Message.FailedChatSocket({ error: 'Connection error' })),
        message(Message.ReleasedChatSocket()),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Connection error' }),
          )
        }),
      )
    })

    test('FailedSendMessage reports an unavailable socket', () => {
      story(
        update,
        given(connectedModel),
        message(Message.FailedSendMessage({ error: 'Socket unavailable' })),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Socket unavailable' }),
          )
        }),
      )
    })
  })

  describe('message input', () => {
    test('UpdatedMessageInput stores the new input value', () => {
      story(
        update,
        given(connectedModel),
        message(Message.UpdatedMessageInput({ value: 'Hello' })),
        model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      )
    })
  })

  describe('SubmittedMessage', () => {
    test('an empty input is ignored', () => {
      story(
        update,
        given(modifyFields(connectedModel, { messageInput: () => '' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
      )
    })

    test('whitespace-only input is ignored', () => {
      story(
        update,
        given(modifyFields(connectedModel, { messageInput: () => '   ' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
      )
    })

    test('connected client fires SendMessage and clears the input', () => {
      story(
        update,
        given(
          modifyFields(connectedModel, { messageInput: () => 'Hello there' }),
        ),
        message(Message.SubmittedMessage()),
        model(model => {
          expect(model.messageInput).toBe('')
        }),
        Command.expectHas(SendMessage),
        Command.resolve(
          SendMessage,
          Message.SucceededSendMessage({ text: 'Hello there' }),
        ),
        Command.expectHas(TimestampSentMessage),
        Command.resolve(
          TimestampSentMessage,
          Message.TimestampedMessage({
            text: 'Hello there',
            zoned: zonedNow,
            isSent: true,
          }),
        ),
        model(model => {
          expect(model.messages).toHaveLength(1)
          expect(model.messages[0]?.text).toBe('Hello there')
          expect(model.messages[0]?.isSent).toBe(true)
        }),
      )
    })

    test('disconnected client ignores SubmittedMessage', () => {
      story(
        update,
        given(modifyFields(idleModel, { messageInput: () => 'Hello' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
        model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      )
    })
  })

  describe('inbound messages', () => {
    test('ReceivedMessage queues TimestampReceivedMessage that appends to the list', () => {
      story(
        update,
        given(connectedModel),
        message(Message.ReceivedMessage({ text: 'echo' })),
        Command.expectHas(TimestampReceivedMessage),
        Command.resolve(
          TimestampReceivedMessage,
          Message.TimestampedMessage({
            text: 'echo',
            zoned: zonedNow,
            isSent: false,
          }),
        ),
        model(model => {
          expect(model.messages).toHaveLength(1)
          expect(model.messages[0]?.isSent).toBe(false)
          expect(model.messages[0]?.text).toBe('echo')
        }),
      )
    })
  })
})
