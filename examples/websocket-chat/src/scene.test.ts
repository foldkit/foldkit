import { DateTime } from 'effect'
import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

import {
  ConnectionConnected,
  ConnectionConnecting,
  ConnectionDisconnected,
  ConnectionError,
  type Model,
  update,
  view,
} from './main'

const idleModel: Model = {
  connection: ConnectionDisconnected(),
  messages: [],
  messageInput: '',
}

const zonedAt = (timestamp: number) =>
  DateTime.makeZonedUnsafe(timestamp, { timeZone: 'UTC' })

describe('view', () => {
  test('initial view shows the heading, status, and a Connect button', () => {
    Scene.scene(
      { update, view },
      Scene.with(idleModel),
      Scene.expect(Scene.text('WebSocket Chat')).toExist(),
      Scene.expect(Scene.text('Disconnected')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Connect to Chat' })).toExist(),
      Scene.expect(Scene.text('No messages yet')).toExist(),
    )
  })

  test('connecting state renders the Connecting message', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...idleModel, connection: ConnectionConnecting() }),
      Scene.expect(Scene.text('Connecting...')).toExist(),
    )
  })

  test('connected state shows the message input and Send button', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...idleModel, connection: ConnectionConnected() }),
      Scene.expect(Scene.placeholder('Type a message...')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Send' })).toBeDisabled(),
      Scene.type(Scene.placeholder('Type a message...'), 'hi'),
      Scene.expect(Scene.role('button', { name: 'Send' })).toBeEnabled(),
    )
  })

  test('error state renders the error and a Try Again button', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...idleModel,
        connection: ConnectionError({ error: 'Connection refused' }),
      }),
      Scene.expect(Scene.text('Connection Error')).toExist(),
      Scene.expect(Scene.text('Connection refused')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Try Again' })).toExist(),
    )
  })

  test('messages render in the conversation list', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...idleModel,
        connection: ConnectionConnected(),
        messages: [
          { text: 'Hello there', zoned: zonedAt(0), isSent: true },
          { text: 'General Kenobi', zoned: zonedAt(0), isSent: false },
        ],
      }),
      Scene.expect(Scene.text('Hello there')).toExist(),
      Scene.expect(Scene.text('General Kenobi')).toExist(),
      Scene.expect(Scene.text('No messages yet')).toBeAbsent(),
    )
  })
})
