import { Option } from 'effect'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import {
  ConnectionState,
  Message,
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './application'
import {
  application,
  deliverToChatSocket,
  zonedAt,
} from './application.fixture'
import { ChatSocket, WaitForOpen } from './chatSocket'

const zonedNow = zonedAt(0)

const connect = [
  message(Message.ClickedConnect()),
  Command.resolve(WaitForOpen, ChatSocket.Message.SucceededWaitForOpen()),
]

describe('update', () => {
  describe('connection state', () => {
    it.effect('ClickedConnect moves into Connecting and opens the socket', () =>
      story(
        application,
        message(Message.ClickedConnect()),
        model(model => {
          expect(model.connection._tag).toBe('Connecting')
          expect(Option.isSome(model.maybeChatSocket)).toBe(true)
        }),
        Command.expectExact(WaitForOpen),
        Command.resolve(WaitForOpen, ChatSocket.Message.SucceededWaitForOpen()),
      ),
    )

    it.effect('an opened socket moves into Connected', () =>
      story(
        application,
        message(Message.ClickedConnect()),
        Command.resolve(WaitForOpen, ChatSocket.Message.SucceededWaitForOpen()),
        model(model => {
          expect(model.connection._tag).toBe('Connected')
        }),
      ),
    )

    it.effect(
      'a closed socket returns to Disconnected and clears messages',
      () =>
        story(
          application,
          ...connect,
          message(
            Message.TimestampedMessage({
              text: 'old',
              zoned: zonedNow,
              isSent: true,
            }),
          ),
          message(deliverToChatSocket(ChatSocket.Message.ClosedSocket())),
          model(model => {
            expect(model.connection._tag).toBe('Disconnected')
            expect(model.messages).toHaveLength(0)
            expect(Option.isNone(model.maybeChatSocket)).toBe(true)
          }),
        ),
    )

    it.effect('a socket that fails to open captures the error message', () =>
      story(
        application,
        message(Message.ClickedConnect()),
        Command.resolve(
          WaitForOpen,
          ChatSocket.Message.FailedWaitForOpen({ error: 'Timeout' }),
        ),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Timeout' }),
          )
          expect(Option.isNone(model.maybeChatSocket)).toBe(true)
        }),
      ),
    )

    it.effect('a socket error releases the socket and keeps the error', () =>
      story(
        application,
        ...connect,
        message(
          deliverToChatSocket(
            ChatSocket.Message.ErroredSocket({ error: 'Connection error' }),
          ),
        ),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Connection error' }),
          )
          expect(Option.isNone(model.maybeChatSocket)).toBe(true)
        }),
      ),
    )

    it.effect('FailedSendMessage reports an unavailable socket', () =>
      story(
        application,
        ...connect,
        message(Message.FailedSendMessage({ error: 'Socket unavailable' })),
        model(model => {
          expect(model.connection).toEqual(
            ConnectionState.Error({ error: 'Socket unavailable' }),
          )
          expect(Option.isNone(model.maybeChatSocket)).toBe(true)
        }),
      ),
    )
  })

  describe('message input', () => {
    it.effect('UpdatedMessageInput stores the new input value', () =>
      story(
        application,
        ...connect,
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
        application,
        ...connect,
        message(Message.SubmittedMessage()),
        Command.expectNone(),
      ),
    )

    it.effect('whitespace-only input is ignored', () =>
      story(
        application,
        ...connect,
        message(Message.UpdatedMessageInput({ value: '   ' })),
        message(Message.SubmittedMessage()),
        Command.expectNone(),
      ),
    )

    it.effect('connected client fires SendMessage and clears the input', () =>
      story(
        application,
        ...connect,
        message(Message.UpdatedMessageInput({ value: 'Hello there' })),
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
          expect(model.messages).toEqual([
            { text: 'Hello there', zoned: zonedNow, isSent: true },
          ])
        }),
      ),
    )

    it.effect('disconnected client ignores SubmittedMessage', () =>
      story(
        application,
        message(Message.UpdatedMessageInput({ value: 'Hello' })),
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
      'a received socket message queues TimestampReceivedMessage that appends to the list',
      () =>
        story(
          application,
          ...connect,
          message(
            deliverToChatSocket(
              ChatSocket.Message.ReceivedSocketMessage({ text: 'echo' }),
            ),
          ),
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
            expect(model.messages).toEqual([
              { text: 'echo', zoned: zonedNow, isSent: false },
            ])
          }),
        ),
    )
  })
})
