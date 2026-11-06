import { DateTime } from 'effect'
import { Scene } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { ApplicationBlock, layer } from './index'
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
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(idleModel),
        Scene.expect(Scene.text('WebSocket Chat')).toExist(),
        Scene.expect(Scene.text('Disconnected')).toExist(),
        Scene.expect(
          Scene.role('button', { name: 'Connect to Chat' }),
        ).toExist(),
        Scene.expect(Scene.text('No messages yet')).toExist(),
      ),
  )

  it.effect('connecting state renders the Connecting message', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(idleModel, {
          connection: () => ConnectionState.Connecting(),
        }),
      ),
      Scene.expect(Scene.text('Connecting...')).toExist(),
    ),
  )

  it.effect('connected state shows the message input and Send button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(idleModel, {
          connection: () => ConnectionState.Connected(),
        }),
      ),
      Scene.expect(Scene.placeholder('Type a message...')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Send' })).toBeDisabled(),
      Scene.type(Scene.placeholder('Type a message...'), 'hi'),
      Scene.expect(Scene.role('button', { name: 'Send' })).toBeEnabled(),
    ),
  )

  it.effect('error state renders the error and a Try Again button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(idleModel, {
          connection: () =>
            ConnectionState.Error({
              error: 'Connection refused',
            }),
        }),
      ),
      Scene.expect(Scene.text('Connection Error')).toExist(),
      Scene.expect(Scene.text('Connection refused')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Try Again' })).toExist(),
    ),
  )

  it.effect('messages render in the conversation list', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(
        modifyFields(idleModel, {
          connection: () => ConnectionState.Connected(),
          messages: () => [
            { text: 'Hello there', zoned: zonedAt(0), isSent: true },
            { text: 'General Kenobi', zoned: zonedAt(0), isSent: false },
          ],
        }),
      ),
      Scene.expect(Scene.text('Hello there')).toExist(),
      Scene.expect(Scene.text('General Kenobi')).toExist(),
      Scene.expect(Scene.text('No messages yet')).toBeAbsent(),
    ),
  )

  it.effect(
    'a successful acquisition connects the chat and the user can send a message',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(idleModel),
        Scene.click(Scene.role('button', { name: 'Connect to Chat' })),
        Scene.expect(Scene.text('Connecting...')).toExist(),
        Scene.ManagedResource.acquire(managedResources.chatSocket),
        Scene.expect(Scene.placeholder('Type a message...')).toExist(),
        Scene.type(Scene.placeholder('Type a message...'), 'hi there'),
        Scene.click(Scene.role('button', { name: 'Send' })),
        Scene.Command.expectExact(SendMessage({ text: 'hi there' })),
        Scene.Command.resolve(
          SendMessage,
          Message.SucceededSendMessage({ text: 'hi there' }),
        ),
        Scene.Command.resolve(
          TimestampSentMessage,
          Message.TimestampedMessage({
            text: 'hi there',
            zoned: zonedAt(0),
            isSent: true,
          }),
        ),
        Scene.expect(Scene.text('hi there')).toExist(),
        Scene.expect(Scene.text('No messages yet')).toBeAbsent(),
      ),
  )

  it.effect('a failed socket acquisition shows the connection error', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(idleModel),
      Scene.click(Scene.role('button', { name: 'Connect to Chat' })),
      Scene.expect(Scene.text('Connecting...')).toExist(),
      Scene.ManagedResource.failAcquire(
        managedResources.chatSocket,
        new Error('Connection timeout'),
      ),
      Scene.expect(Scene.text('Connection Error')).toExist(),
      Scene.expect(Scene.text('Connection timeout')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Try Again' })).toExist(),
    ),
  )

  it.effect(
    'a message arriving on the socket Subscription lands in the conversation',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(idleModel, {
            connection: () => ConnectionState.Connected(),
          }),
        ),
        Scene.Subscription.emit(
          subscriptions.chatSocketMessages,
          Message.ReceivedMessage({ text: 'hello from echo' }),
        ),
        Scene.Command.expectExact(
          TimestampReceivedMessage({ text: 'hello from echo' }),
        ),
        Scene.Command.resolve(
          TimestampReceivedMessage,
          Message.TimestampedMessage({
            text: 'hello from echo',
            zoned: zonedAt(0),
            isSent: false,
          }),
        ),
        Scene.expect(Scene.text('hello from echo')).toExist(),
        Scene.expect(Scene.text('No messages yet')).toBeAbsent(),
      ),
  )
})
