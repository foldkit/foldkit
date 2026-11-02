import { Effect, Schema } from 'effect'
import { Socket } from 'effect/socket'
import * as Block from 'foldkit/block'

import { ChatRoomContract } from './chatRoom/definition'

const Model = Schema.Struct({
  general: ChatRoomContract.Model,
  random: ChatRoomContract.Model,
  rooms: Schema.Record(Schema.String, ChatRoomContract.Model),
})
export const ApplicationKey = Symbol('OpaqueCapabilityChatApplication')

const Definition = Block.makeDefinition('OpaqueCapabilityChatApplication', {
  key: ApplicationKey,
  Model,
  Message: Schema.Never,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [Socket.WebSocketConstructor] },
})
export const GeneralBinding = Definition.makeBinding(ChatRoomContract, {
  field: 'general',
  init: { contextToArgs: () => [{ title: 'General', inputId: 'general' }] },
})
export const RandomBinding = Definition.makeBinding(ChatRoomContract, {
  field: 'random',
  init: { contextToArgs: () => [{ title: 'Random', inputId: 'random' }] },
})
export const RoomsBinding = Definition.makeMapBinding(ChatRoomContract, {
  field: 'rooms',
})
const Composition = Definition.makeComposition({
  bindings: [GeneralBinding, RandomBinding, RoomsBinding],
})
export const ApplicationBlock = Definition.makeBlock(
  Effect.gen(function* () {
    const general = yield* GeneralBinding
    const random = yield* RandomBinding
    const rooms = yield* RoomsBinding

    return {
      children: [general, random, rooms],
      init: Composition.makeInit(() => ({ model: { rooms: {} } })),
      update: Composition.makeUpdate({}),
      view: Composition.makeView((_model, h) => h.empty),
    }
  }),
)
