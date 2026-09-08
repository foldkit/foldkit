import { DateTime } from 'effect'
import {
  Command,
  ManagedResource,
  Subscription,
  click,
  expect,
  given,
  placeholder,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import {
  ConnectionState,
  Message,
  Model,
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
  managedResources,
  update,
  view,
} from './main'

const idleModel = Model.make({
  connection: ConnectionState.Disconnected(),
  messages: [],
  messageInput: '',
})

const zonedAt = (timestamp: number) =>
  DateTime.makeZonedUnsafe(timestamp, { timeZone: 'UTC' })

describe('view', () => {
  test('initial view shows the heading, status, and a Connect button', () => {
    scene(
      { update, view },
      given(idleModel),
      expect(text('WebSocket Chat')).toExist(),
      expect(text('Disconnected')).toExist(),
      expect(role('button', { name: 'Connect to Chat' })).toExist(),
      expect(text('No messages yet')).toExist(),
    )
  })

  test('connecting state renders the Connecting message', () => {
    scene(
      { update, view },
      given(evo(idleModel, { connection: () => ConnectionState.Connecting() })),
      expect(text('Connecting...')).toExist(),
    )
  })

  test('connected state shows the message input and Send button', () => {
    scene(
      { update, view },
      given(evo(idleModel, { connection: () => ConnectionState.Connected() })),
      expect(placeholder('Type a message...')).toExist(),
      expect(role('button', { name: 'Send' })).toBeDisabled(),
      type(placeholder('Type a message...'), 'hi'),
      expect(role('button', { name: 'Send' })).toBeEnabled(),
    )
  })

  test('error state renders the error and a Try Again button', () => {
    scene(
      { update, view },
      given(
        evo(idleModel, {
          connection: () =>
            ConnectionState.Error({
              error: 'Connection refused',
            }),
        }),
      ),
      expect(text('Connection Error')).toExist(),
      expect(text('Connection refused')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    )
  })

  test('messages render in the conversation list', () => {
    scene(
      { update, view },
      given(
        evo(idleModel, {
          connection: () => ConnectionState.Connected(),
          messages: () => [
            { text: 'Hello there', zoned: zonedAt(0), isSent: true },
            { text: 'General Kenobi', zoned: zonedAt(0), isSent: false },
          ],
        }),
      ),
      expect(text('Hello there')).toExist(),
      expect(text('General Kenobi')).toExist(),
      expect(text('No messages yet')).toBeAbsent(),
    )
  })

  test('a successful acquisition connects the chat and the user can send a message', () => {
    scene(
      { update, view },
      given(idleModel),
      click(role('button', { name: 'Connect to Chat' })),
      expect(text('Connecting...')).toExist(),
      ManagedResource.acquire(managedResources.chatSocket),
      expect(placeholder('Type a message...')).toExist(),
      type(placeholder('Type a message...'), 'hi there'),
      click(role('button', { name: 'Send' })),
      Command.expectExact(SendMessage({ text: 'hi there' })),
      Command.resolve(
        SendMessage,
        Message.SucceededSendMessage({ text: 'hi there' }),
      ),
      Command.resolve(
        TimestampSentMessage,
        Message.TimestampedMessage({
          text: 'hi there',
          zoned: zonedAt(0),
          isSent: true,
        }),
      ),
      expect(text('hi there')).toExist(),
      expect(text('No messages yet')).toBeAbsent(),
    )
  })

  test('a failed socket acquisition shows the connection error', () => {
    scene(
      { update, view },
      given(idleModel),
      click(role('button', { name: 'Connect to Chat' })),
      expect(text('Connecting...')).toExist(),
      ManagedResource.failAcquire(
        managedResources.chatSocket,
        new Error('Connection timeout'),
      ),
      expect(text('Connection Error')).toExist(),
      expect(text('Connection timeout')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    )
  })

  test('a message arriving on the socket Subscription lands in the conversation', () => {
    scene(
      { update, view },
      given(evo(idleModel, { connection: () => ConnectionState.Connected() })),
      Subscription.emit(Message.ReceivedMessage({ text: 'hello from echo' })),
      Command.expectExact(
        TimestampReceivedMessage({ text: 'hello from echo' }),
      ),
      Command.resolve(
        TimestampReceivedMessage,
        Message.TimestampedMessage({
          text: 'hello from echo',
          zoned: zonedAt(0),
          isSent: false,
        }),
      ),
      expect(text('hello from echo')).toExist(),
      expect(text('No messages yet')).toBeAbsent(),
    )
  })
})
