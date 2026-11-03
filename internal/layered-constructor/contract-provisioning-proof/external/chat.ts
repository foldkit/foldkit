import { Effect, Layer } from 'effect'
import { Socket } from 'effect/socket'
import { Program, Runtime } from 'foldkit'
import type * as Contracted from 'foldkit/experimental/contracted'
import { Story, withBlock } from 'foldkit/experimental/layered/testing'
import { Subscription } from 'foldkit/scene'

import { ChatRoomContract } from '../chat/chatRoom/definition.js'
import { Message } from '../chat/chatRoom/message.js'
import { RoomStartup } from '../chat/chatRoom/roomStartup.js'
import { ChatRoomWithComposerBlock } from '../chat/provided.js'

export const pureStory = Story.story(
  ChatRoomWithComposerBlock,
  Story.init({ title: 'General', inputId: 'general-input' }),
  Story.message(Message.RequestedDisconnect()),
)

export const privateSubscriptionTest = withBlock(
  ChatRoomWithComposerBlock,
  block => {
    Subscription.emit(
      block.subscriptions.chatSocketMessages,
      Message.ReceivedMessage({ text: 'Hello' }),
    )
    // @ts-expect-error Selected implementation registry keys remain precise after relocation.
    block.subscriptions.missing
  },
)

const pending = Program.makeElement({
  block: ChatRoomWithComposerBlock,
  container: null,
  Flags: RoomStartup,
  flags: Effect.succeed(
    RoomStartup.make({ title: 'General', inputId: 'general-input' }),
  ),
})
// @ts-expect-error Runtime execution still requires the external WebSocket Service.
Runtime.run(pending)
const ready = pending.provide(Socket.layerWebSocketConstructorGlobal)
Runtime.run(ready)

Effect.gen(function* () {
  const room = yield* ChatRoomContract.get
  room.init({ title: 'General', inputId: 'general-input' })
  // @ts-expect-error The public startup Schema remains exact.
  room.init({ title: 'General', inputId: 1 })
})

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value
export type NoSocketMockForPureStory = Assert<
  Equal<Effect.Services<typeof pureStory>, never>
>
export type ChildConstructionClosed = Assert<
  Equal<Layer.Services<typeof ChatRoomWithComposerBlock.layer>, never>
>
export type RuntimeRequirement = Assert<
  Equal<
    Contracted.FactsOf<typeof ChatRoomWithComposerBlock>['programRequirements'],
    Socket.WebSocketConstructor
  >
>
