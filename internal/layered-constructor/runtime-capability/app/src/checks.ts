import { Array, type Context, Effect, Layer, Option } from 'effect'
import { Socket } from 'effect/socket'
import type { FactsOf, RuntimeCapability } from 'foldkit/block'

import { ApplicationBlock } from './application'
import { ChatRoomContract } from './chatRoom/definition'
import { Message } from './chatRoom/message'
import { ChatRoomWithComposerBlock } from './provided'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Expect<Value extends true> = Value
export type OrdinaryServicePreserved = Expect<
  Equal<
    FactsOf<typeof ChatRoomContract>['programRequirements'],
    Socket.WebSocketConstructor
  >
>
export type PrivateRefsClosed = Expect<
  Equal<
    FactsOf<typeof ChatRoomContract>['runtimeServices'],
    RuntimeCapability<typeof ChatRoomContract.owner>
  >
>
export type ParentOrdinaryServicePreserved = Expect<
  Equal<
    FactsOf<typeof ApplicationBlock>['programRequirements'],
    Socket.WebSocketConstructor
  >
>
export type HandlerBuildNeedsNoOccurrence = Expect<
  Equal<
    FactsOf<typeof ChatRoomContract>['effectsLayerRequirements'],
    Socket.WebSocketConstructor
  >
>

export const missingRuntime = ChatRoomContract.get.pipe(
  Effect.flatMap(room => Layer.build(room.EffectsLayer)),
)
export const detachedHandlerBuild = Effect.scoped(missingRuntime).pipe(
  Effect.provide(ChatRoomWithComposerBlock.layer),
  Effect.provide(Socket.layerWebSocketConstructorGlobal),
)
export type DetachedBuildIsRunnable = Expect<
  Equal<Effect.Services<typeof detachedHandlerBuild>, never>
>
export const missingCapability = Effect.scoped(
  Effect.gen(function* () {
    const room = yield* ChatRoomContract.get
    const handlers = yield* Layer.build(room.EffectsLayer)
    const roomInit = room.init({ title: 'Detached', inputId: 'detached' })
    const received = room.update(
      roomInit.model,
      Message.ReceivedMessage({ text: 'Detached' }),
    )
    const command = Option.getOrThrow(Array.head(received.commands ?? []))

    return yield* command.effect.pipe(Effect.provideContext(handlers))
  }),
).pipe(
  Effect.provide(ChatRoomWithComposerBlock.layer),
  Effect.provide(Socket.layerWebSocketConstructorGlobal),
)
export type MissingCapabilityIsExact = Expect<
  Equal<
    Effect.Services<typeof missingCapability>,
    RuntimeCapability<typeof ChatRoomContract.owner>
  >
>
declare const wrongOwnerContext: Context.Context<
  RuntimeCapability<typeof ApplicationBlock.owner>
>

if (false) {
  // @ts-expect-error Ordinary handler construction cannot supply the Runtime occurrence capability.
  Effect.runPromise(missingCapability)
  const wrongProvider = missingCapability.pipe(
    Effect.provideContext(wrongOwnerContext),
  )
  // @ts-expect-error A different Block's occurrence capability does not satisfy this Room.
  Effect.runPromise(wrongProvider)
}
