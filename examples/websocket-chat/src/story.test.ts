import { DateTime } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { ConnectionState, type Model } from './model'

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
    it.effect('ClickedConnect moves into Connecting', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(idleModel),
        Story.message(Message.ClickedConnect()),
        Story.model(model => {
          expect(model.connection._tag).toBe('Connecting')
        }),
      ),
    )

    it.effect('ConnectedChatSocket moves into Connected', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connecting(),
          }),
        ),
        Story.message(Message.ConnectedChatSocket()),
        Story.model(model => {
          expect(model.connection._tag).toBe('Connected')
        }),
      ),
    )

    it.effect(
      'DisconnectedChatSocket returns to Disconnected and clears messages',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(connectedModel, {
              messages: () => [{ text: 'old', zoned: zonedNow, isSent: true }],
            }),
          ),
          Story.message(Message.DisconnectedChatSocket()),
          Story.model(model => {
            expect(model.connection._tag).toBe('Disconnected')
            expect(model.messages).toHaveLength(0)
          }),
        ),
    )

    it.effect('FailedConnectChatSocket captures the error message', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connecting(),
          }),
        ),
        Story.message(Message.FailedConnectChatSocket({ error: 'Timeout' })),
        Story.model(model => {
          if (model.connection._tag === 'Error') {
            expect(model.connection.error).toBe('Timeout')
          } else {
            throw new Error('Expected Error')
          }
        }),
      ),
    )

    it.effect('releasing the socket preserves a connection error', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(connectedModel),
        Story.message(Message.FailedChatSocket({ error: 'Connection error' })),
        Story.message(Message.ReleasedChatSocket()),
        Story.model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Connection error' }),
          )
        }),
      ),
    )

    it.effect('FailedSendMessage reports an unavailable socket', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(connectedModel),
        Story.message(
          Message.FailedSendMessage({ error: 'Socket unavailable' }),
        ),
        Story.model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Socket unavailable' }),
          )
        }),
      ),
    )
  })

  describe('message input', () => {
    it.effect('UpdatedMessageInput stores the new input value', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(connectedModel),
        Story.message(Message.UpdatedMessageInput({ value: 'Hello' })),
        Story.model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      ),
    )
  })

  describe('SubmittedMessage', () => {
    it.effect('an empty input is ignored', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modifyFields(connectedModel, { messageInput: () => '' })),
        Story.message(Message.SubmittedMessage()),
        Story.Command.expectNone(),
      ),
    )

    it.effect('whitespace-only input is ignored', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(connectedModel, { messageInput: () => '   ' }),
        ),
        Story.message(Message.SubmittedMessage()),
        Story.Command.expectNone(),
      ),
    )

    it.effect('connected client fires SendMessage and clears the input', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(
          modifyFields(connectedModel, { messageInput: () => 'Hello there' }),
        ),
        Story.message(Message.SubmittedMessage()),
        Story.model(model => {
          expect(model.messageInput).toBe('')
        }),
        Story.Command.expectHas(SendMessage),
        Story.Command.resolve(
          SendMessage,
          Message.SucceededSendMessage({ text: 'Hello there' }),
        ),
        Story.Command.expectHas(TimestampSentMessage),
        Story.Command.resolve(
          TimestampSentMessage,
          Message.TimestampedMessage({
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
      ),
    )

    it.effect('disconnected client ignores SubmittedMessage', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(modifyFields(idleModel, { messageInput: () => 'Hello' })),
        Story.message(Message.SubmittedMessage()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      ),
    )
  })

  describe('inbound messages', () => {
    it.effect(
      'ReceivedMessage queues TimestampReceivedMessage that appends to the list',
      () =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(connectedModel),
          Story.message(Message.ReceivedMessage({ text: 'echo' })),
          Story.Command.expectHas(TimestampReceivedMessage),
          Story.Command.resolve(
            TimestampReceivedMessage,
            Message.TimestampedMessage({
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
        ),
    )
  })
})
