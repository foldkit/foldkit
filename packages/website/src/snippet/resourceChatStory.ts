import { Layer } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Chat, ChatLive } from './resourceChat'
import { SendData, Socket, SocketLive } from './resourceSocket'

const ChatTest = ChatLive.pipe(Layer.provide(SocketLive))

it.effect('received socket data is appended to the chat', () =>
  story(
    ChatTest,
    message(Chat.Message.ClickedConnect()),
    message(
      Block.deliver(
        Socket,
        'socket',
        Socket.Message.ReceivedData({ data: 'hi' }),
      ),
    ),
    model(model => expect(model.lines).toEqual(['hi'])),
  ),
)

it.effect('saying hello sends through the connected socket', () =>
  story(
    ChatTest,
    message(Chat.Message.ClickedConnect()),
    message(Chat.Message.ClickedSendHello()),
    Command.expectExact(
      Command.at('socket', SendData({ roomId: 'general', data: 'hello' })),
    ),
  ),
)
