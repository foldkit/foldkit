import { Array, Effect, Record, Schema } from 'effect'
import { Socket } from 'effect/socket'
import { makeInitIfMissingStep } from 'foldkit/bindingInit'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import { ChatRoomContract } from './chatRoom/definition'
import { ChatRoomWithComposerBlock } from './provided'

const Model = Schema.Struct({
  general: ChatRoomContract.Model,
  random: ChatRoomContract.Model,
  rooms: Schema.Record(Schema.String, ChatRoomContract.Model),
})
const Message = defineMessageUnion({
  ClickedAddSupport: {},
  ClickedRemoveSupport: {},
})
export const RoomCollectionKey = Symbol('RoomCollection')
const Definition = Block.makeDefinition('RoomCollection', {
  key: RoomCollectionKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [Socket.WebSocketConstructor] },
})
const GeneralBinding = Definition.makeBinding(ChatRoomContract, {
  field: 'general',
  init: {
    contextToArgs: () => [{ title: 'General', inputId: 'general-message' }],
  },
})
const RandomBinding = Definition.makeBinding(ChatRoomContract, {
  field: 'random',
  init: {
    contextToArgs: () => [{ title: 'Random', inputId: 'random-message' }],
  },
})
const RoomsBinding = Definition.makeMapBinding(ChatRoomContract, {
  field: 'rooms',
})
const Composition = Definition.makeComposition({
  bindings: [GeneralBinding, RandomBinding, RoomsBinding],
})
const addSupport = makeInitIfMissingStep(RoomsBinding, {
  key: 'support',
  args: [{ title: 'Support', inputId: 'support-message' }],
})
const init = Composition.makeInit(() => ({
  model: { rooms: {} },
  steps: [addSupport],
}))
const update = Composition.makeUpdate({
  ClickedAddSupport: addSupport,
  ClickedRemoveSupport: Definition.makeFieldsStep(() => ({
    rooms: Record.remove('support'),
  })),
})
const view = Composition.makeView((model, h) =>
  h.main(
    [],
    [
      h.block(
        GeneralBinding.embedView({ slotId: 'general', model: model.general }),
      ),
      h.block(
        RandomBinding.embedView({ slotId: 'random', model: model.random }),
      ),
      ...Array.map(Record.toEntries(model.rooms), ([key, room]) =>
        h.block(RoomsBinding.embedView({ key, slotId: key, model: room })),
      ),
      Record.has(model.rooms, 'support')
        ? h.button(
            [h.OnClick(Message.ClickedRemoveSupport())],
            ['Remove Support'],
          )
        : h.button([h.OnClick(Message.ClickedAddSupport())], ['Add Support']),
    ],
  ),
)

export const RoomCollectionBlock = Definition.makeBlock(
  Effect.gen(function* () {
    const general = yield* GeneralBinding
    const random = yield* RandomBinding
    const rooms = yield* RoomsBinding

    return { children: [general, random, rooms], init, update, view }
  }),
).provide(ChatRoomWithComposerBlock.layer)
