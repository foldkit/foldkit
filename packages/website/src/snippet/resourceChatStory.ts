import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import { message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { Chat, ChatLive } from './resourceChat'
import { Socket } from './resourceSocket'

const SocketStub = Socket.make(
  Effect.fn(function* () {
    return {
      update: {
        Received: (model, { data }) => ({
          model,
          outMessage: Socket.OutMessage.Received({ data }),
        }),
      },
      expose: { send: () => Effect.void },
    }
  }),
)

it.effect('received socket data is appended to the chat', () =>
  story(
    ChatLive.pipe(Layer.provide(SocketStub)),
    message(Chat.Message.ClickedConnect()),
    message(
      Block.deliver(Socket, 'socket', Socket.Message.Received({ data: 'hi' })),
    ),
    model(model => expect(model.lines).toEqual(['hi'])),
  ),
)
