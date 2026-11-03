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
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock } from './block'
import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { managedResources } from './managedResource'
import { Message } from './message'
import { ConnectionState, Model } from './model'
import { subscriptions } from './subscription'

const idleModel = Model.make({
  connection: ConnectionState.Disconnected(),
  messages: [],
  messageInput: '',
})

const zonedAt = (timestamp: number) =>
  DateTime.makeZonedUnsafe(timestamp, { timeZone: 'UTC' })

describe('view', () => {
  it.effect(
    'initial view shows the heading, status, and a Connect button',
    () =>
      scene(
        ApplicationBlock,
        given(idleModel),
        expect(text('WebSocket Chat')).toExist(),
        expect(text('Disconnected')).toExist(),
        expect(role('button', { name: 'Connect to Chat' })).toExist(),
        expect(text('No messages yet')).toExist(),
      ),
  )

  it.effect('connecting state renders the Connecting message', () =>
    scene(
      ApplicationBlock,
      given(
        modifyFields(idleModel, {
          connection: () => ConnectionState.Connecting(),
        }),
      ),
      expect(text('Connecting...')).toExist(),
    ),
  )

  it.effect('connected state shows the message input and Send button', () =>
    scene(
      ApplicationBlock,
      given(
        modifyFields(idleModel, {
          connection: () => ConnectionState.Connected(),
        }),
      ),
      expect(placeholder('Type a message...')).toExist(),
      expect(role('button', { name: 'Send' })).toBeDisabled(),
      type(placeholder('Type a message...'), 'hi'),
      expect(role('button', { name: 'Send' })).toBeEnabled(),
    ),
  )

  it.effect('error state renders the error and a Try Again button', () =>
    scene(
      ApplicationBlock,
      given(
        modifyFields(idleModel, {
          connection: () =>
            ConnectionState.Error({
              error: 'Connection refused',
            }),
        }),
      ),
      expect(text('Connection Error')).toExist(),
      expect(text('Connection refused')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    ),
  )

  it.effect('messages render in the conversation list', () =>
    scene(
      ApplicationBlock,
      given(
        modifyFields(idleModel, {
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
    ),
  )

  it.effect(
    'a successful acquisition connects the chat and the user can send a message',
    () =>
      scene(
        ApplicationBlock,
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
      ),
  )

  it.effect('a failed socket acquisition shows the connection error', () =>
    scene(
      ApplicationBlock,
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
    ),
  )

  it.effect(
    'a message arriving on the socket Subscription lands in the conversation',
    () =>
      scene(
        ApplicationBlock,
        given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connected(),
          }),
        ),
        Subscription.emit(
          subscriptions.chatSocketMessages,
          Message.ReceivedMessage({ text: 'hello from echo' }),
        ),
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
      ),
  )
})
