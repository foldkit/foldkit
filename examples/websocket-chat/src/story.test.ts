import { DateTime } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'
import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
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
      story(
        { block: ApplicationBlock, layer },
        given(idleModel),
        message(Message.ClickedConnect()),
        model(model => {
          expect(model.connection._tag).toBe('Connecting')
        }),
      ),
    )

    it.effect('ConnectedChatSocket moves into Connected', () =>
      story(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connecting(),
          }),
        ),
        message(Message.ConnectedChatSocket()),
        model(model => {
          expect(model.connection._tag).toBe('Connected')
        }),
      ),
    )

    it.effect(
      'DisconnectedChatSocket returns to Disconnected and clears messages',
      () =>
        story(
          { block: ApplicationBlock, layer },
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
        ),
    )

    it.effect('FailedConnectChatSocket captures the error message', () =>
      story(
        { block: ApplicationBlock, layer },
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
      ),
    )

    it.effect('releasing the socket preserves a connection error', () =>
      story(
        { block: ApplicationBlock, layer },
        given(connectedModel),
        message(Message.FailedChatSocket({ error: 'Connection error' })),
        message(Message.ReleasedChatSocket()),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Connection error' }),
          )
        }),
      ),
    )

    it.effect('FailedSendMessage reports an unavailable socket', () =>
      story(
        { block: ApplicationBlock, layer },
        given(connectedModel),
        message(Message.FailedSendMessage({ error: 'Socket unavailable' })),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Socket unavailable' }),
          )
        }),
      ),
    )
  })

  describe('message input', () => {
    it.effect('UpdatedMessageInput stores the new input value', () =>
      story(
        { block: ApplicationBlock, layer },
        given(connectedModel),
        message(Message.UpdatedMessageInput({ value: 'Hello' })),
        model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      ),
    )
  })

  describe('SubmittedMessage', () => {
    it.effect('an empty input is ignored', () =>
      story(
        { block: ApplicationBlock, layer },
        given(modifyFields(connectedModel, { messageInput: () => '' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
      ),
    )

    it.effect('whitespace-only input is ignored', () =>
      story(
        { block: ApplicationBlock, layer },
        given(modifyFields(connectedModel, { messageInput: () => '   ' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
      ),
    )

    it.effect('connected client fires SendMessage and clears the input', () =>
      story(
        { block: ApplicationBlock, layer },
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
      ),
    )

    it.effect('disconnected client ignores SubmittedMessage', () =>
      story(
        { block: ApplicationBlock, layer },
        given(modifyFields(idleModel, { messageInput: () => 'Hello' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
        model(model => {
          expect(model.messageInput).toBe('Hello')
        }),
      ),
    )
  })

  describe('inbound messages', () => {
    it.effect(
      'ReceivedMessage queues TimestampReceivedMessage that appends to the list',
      () =>
        story(
          { block: ApplicationBlock, layer },
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
        ),
    )
  })
})
