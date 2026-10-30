import { Option } from 'effect'
import {
  Command,
  click,
  expect,
  given,
  placeholder,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import {
  ConnectionState,
  Message,
  SendMessage,
  TimestampSentMessage,
} from './application'
import { application, zonedAt } from './application.fixture'
import { ChatSocket, WaitForOpen } from './chatSocket'

const idleModel = {
  connection: ConnectionState.Disconnected(),
  maybeChatSocket: Option.none(),
  messages: [],
  messageInput: '',
}

describe('view', () => {
  it.effect(
    'initial view shows the heading, status, and a Connect button',
    () =>
      scene(
        application,
        expect(text('WebSocket Chat')).toExist(),
        expect(text('Disconnected')).toExist(),
        expect(role('button', { name: 'Connect to Chat' })).toExist(),
        expect(text('No messages yet')).toExist(),
      ),
  )

  it.effect('connecting state renders the Connecting message', () =>
    scene(
      application,
      click(role('button', { name: 'Connect to Chat' })),
      expect(text('Connecting...')).toExist(),
      Command.resolve(WaitForOpen, ChatSocket.Message.SucceededWaitForOpen()),
    ),
  )

  it.effect('connected state shows the message input and Send button', () =>
    scene(
      application,
      click(role('button', { name: 'Connect to Chat' })),
      Command.resolve(WaitForOpen, ChatSocket.Message.SucceededWaitForOpen()),
      expect(placeholder('Type a message...')).toExist(),
      expect(role('button', { name: 'Send' })).toBeDisabled(),
      type(placeholder('Type a message...'), 'hi'),
      expect(role('button', { name: 'Send' })).toBeEnabled(),
    ),
  )

  it.effect('error state renders the error and a Try Again button', () =>
    scene(
      application,
      given({
        ...idleModel,
        connection: ConnectionState.Error({ error: 'Connection refused' }),
      }),
      expect(text('Connection Error')).toExist(),
      expect(text('Connection refused')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    ),
  )

  it.effect('messages render in the conversation list', () =>
    scene(
      application,
      given({
        ...idleModel,
        connection: ConnectionState.Connected(),
        messages: [
          { text: 'Hello there', zoned: zonedAt(0), isSent: true },
          { text: 'General Kenobi', zoned: zonedAt(0), isSent: false },
        ],
      }),
      expect(text('Hello there')).toExist(),
      expect(text('General Kenobi')).toExist(),
      expect(text('No messages yet')).toBeAbsent(),
    ),
  )

  it.effect(
    'an opened socket connects the chat and the user can send a message',
    () =>
      scene(
        application,
        click(role('button', { name: 'Connect to Chat' })),
        expect(text('Connecting...')).toExist(),
        Command.resolve(WaitForOpen, ChatSocket.Message.SucceededWaitForOpen()),
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

  it.effect('a socket that fails to open shows the connection error', () =>
    scene(
      application,
      click(role('button', { name: 'Connect to Chat' })),
      expect(text('Connecting...')).toExist(),
      Command.resolve(
        WaitForOpen,
        ChatSocket.Message.FailedWaitForOpen({ error: 'Connection timeout' }),
      ),
      expect(text('Connection Error')).toExist(),
      expect(text('Connection timeout')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    ),
  )
})
