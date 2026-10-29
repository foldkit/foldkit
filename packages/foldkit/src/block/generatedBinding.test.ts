import { Array, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { runtimeBindingOf } from './composition.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const ChildMessage = defineMessageUnion({ ClickedIncrement: {} })
type ChildMessage = typeof ChildMessage.Type

const AccessorChildModel = Schema.Struct({ count: Schema.Number })
type AccessorChildModel = typeof AccessorChildModel.Type
const AccessorChildDefinition = makeDefinition('GeneratedAccessorChild', {
  Model: AccessorChildModel,
  Message: ChildMessage,
})
const AccessorChildComposition = AccessorChildDefinition.makeComposition()
const prepareAccessorChildBlock = () =>
  AccessorChildComposition.prepareBlock({
    init: AccessorChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: AccessorChildComposition.makeUpdate.withContext(
      (amount: number) => ({
        ClickedIncrement: (model, _message) => ({
          model: modifyFields(model, { count: count => count + amount }),
        }),
      }),
    ),
    view: AccessorChildComposition.makeView((_model, h) => h.div([])),
  })
const AccessorChildBlock: Block.FromAssemblyWithView<
  typeof AccessorChildModel,
  typeof prepareAccessorChildBlock
> = Block.assemble(prepareAccessorChildBlock)

const AccessorParentModel = Schema.Struct({
  child: AccessorChildModel,
  amount: Schema.Number,
  isEnabled: Schema.Boolean,
})
type AccessorParentModel = typeof AccessorParentModel.Type
const AccessorParentMessage = defineMessageUnion({ ClickedParent: {} })
type AccessorParentMessage = typeof AccessorParentMessage.Type
const AccessorParentDefinition = makeDefinition('GeneratedAccessorParent', {
  Model: AccessorParentModel,
  Message: AccessorParentMessage,
})
const AccessorBinding = AccessorParentDefinition.makeBinding(
  AccessorChildBlock,
  {
    read: model => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
    delivery: {
      when: model => model.isEnabled,
      toUpdateContext: model => [model.amount],
    },
  },
)
const AccessorParentComposition = AccessorParentDefinition.makeComposition({
  bindings: [AccessorBinding],
})
const updateAccessorParent = AccessorParentComposition.makeUpdate({
  ClickedParent: model => ({ model }),
})

const OptionalContextChildDefinition = makeDefinition(
  'GeneratedOptionalContextChild',
  {
    Model: AccessorChildModel,
    Message: ChildMessage,
  },
)
const OptionalContextChildComposition =
  OptionalContextChildDefinition.makeComposition()
const prepareOptionalContextChildBlock = () =>
  OptionalContextChildComposition.prepareBlock({
    init: OptionalContextChildComposition.makeInit(() => ({
      model: { count: 0 },
    })),
    update: OptionalContextChildComposition.makeUpdate.withContext(
      (amount?: number) => ({
        ClickedIncrement: (model, _message) => ({
          model: modifyFields(model, {
            count: count => count + (amount ?? 0),
          }),
        }),
      }),
    ),
    view: OptionalContextChildComposition.makeView((_model, h) => h.div([])),
  })
const OptionalContextChildBlock: Block.FromAssemblyWithView<
  typeof AccessorChildModel,
  typeof prepareOptionalContextChildBlock
> = Block.assemble(prepareOptionalContextChildBlock)

const DefaultContextChildDefinition = makeDefinition(
  'GeneratedDefaultContextChild',
  {
    Model: AccessorChildModel,
    Message: ChildMessage,
  },
)
const DefaultContextChildComposition =
  DefaultContextChildDefinition.makeComposition()
const prepareDefaultContextChildBlock = () =>
  DefaultContextChildComposition.prepareBlock({
    init: DefaultContextChildComposition.makeInit(() => ({
      model: { count: 0 },
    })),
    update: DefaultContextChildComposition.makeUpdate.withContext(
      (amount: number = 0) => ({
        ClickedIncrement: (model, _message) => ({
          model: modifyFields(model, { count: count => count + amount }),
        }),
      }),
    ),
    view: DefaultContextChildComposition.makeView((_model, h) => h.div([])),
  })
const DefaultContextChildBlock: Block.FromAssemblyWithView<
  typeof AccessorChildModel,
  typeof prepareDefaultContextChildBlock
> = Block.assemble(prepareDefaultContextChildBlock)

const RestContextChildDefinition = makeDefinition('GeneratedRestContextChild', {
  Model: AccessorChildModel,
  Message: ChildMessage,
})
const RestContextChildComposition = RestContextChildDefinition.makeComposition()
const prepareRestContextChildBlock = () =>
  RestContextChildComposition.prepareBlock({
    init: RestContextChildComposition.makeInit(() => ({
      model: { count: 0 },
    })),
    update: RestContextChildComposition.makeUpdate.withContext(
      (...amounts: ReadonlyArray<number>) => ({
        ClickedIncrement: (model, _message) => ({
          model: modifyFields(model, {
            count: count =>
              count + Array.reduce(amounts, 0, (sum, amount) => sum + amount),
          }),
        }),
      }),
    ),
    view: RestContextChildComposition.makeView((_model, h) => h.div([])),
  })
const RestContextChildBlock: Block.FromAssemblyWithView<
  typeof AccessorChildModel,
  typeof prepareRestContextChildBlock
> = Block.assemble(prepareRestContextChildBlock)

const optionalContextBinding = AccessorParentDefinition.makeBinding(
  OptionalContextChildBlock,
  {
    placement: 'optionalContext',
    read: model => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
const defaultContextBinding = AccessorParentDefinition.makeBinding(
  DefaultContextChildBlock,
  {
    placement: 'defaultContext',
    read: model => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
const restContextBinding = AccessorParentDefinition.makeBinding(
  RestContextChildBlock,
  {
    placement: 'restContext',
    read: model => Option.some(model.child),
    write: (model, nextChild) =>
      modifyFields(model, { child: () => nextChild }),
    delivery: { toUpdateContext: model => [model.amount] },
  },
)
const ContextVariantsParentComposition =
  AccessorParentDefinition.makeComposition({
    bindings: [
      optionalContextBinding,
      defaultContextBinding,
      restContextBinding,
    ],
  })
const updateContextVariantsParent = ContextVariantsParentComposition.makeUpdate(
  {
    ClickedParent: model => ({ model }),
  },
)

const KeyedChildModel = Schema.Struct({
  id: Schema.String,
  count: Schema.Number,
})
type KeyedChildModel = typeof KeyedChildModel.Type
const KeyedChildDefinition = makeDefinition('GeneratedKeyedChild', {
  Model: KeyedChildModel,
  Message: ChildMessage,
})
const KeyedChildComposition = KeyedChildDefinition.makeComposition()
const prepareKeyedChildBlock = () =>
  KeyedChildComposition.prepareBlock({
    init: KeyedChildComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: KeyedChildComposition.makeUpdate.withContext((amount: number) => ({
      ClickedIncrement: (model, _message) => ({
        model: modifyFields(model, { count: count => count + amount }),
      }),
    })),
    view: KeyedChildComposition.makeView((_model, h) => h.div([])),
  })
const KeyedChildBlock: Block.FromAssemblyWithView<
  typeof KeyedChildModel,
  typeof prepareKeyedChildBlock
> = Block.assemble(prepareKeyedChildBlock)

const KeyedParentModel = Schema.Struct({
  children: Schema.Array(KeyedChildModel),
  amount: Schema.Number,
  isEnabled: Schema.Boolean,
})
type KeyedParentModel = typeof KeyedParentModel.Type
const KeyedParentMessage = defineMessageUnion({ ClickedParent: {} })
type KeyedParentMessage = typeof KeyedParentMessage.Type
const KeyedParentDefinition = makeDefinition('GeneratedKeyedParent', {
  Model: KeyedParentModel,
  Message: KeyedParentMessage,
})
const KeyedBinding = KeyedParentDefinition.makeBinding(KeyedChildBlock, {
  field: 'children',
  key: 'id',
  delivery: {
    when: (model, key) => model.isEnabled && key !== 'blocked',
    toUpdateContext: model => [model.amount],
  },
})
const KeyedParentComposition = KeyedParentDefinition.makeComposition({
  bindings: [KeyedBinding],
})
const updateKeyedParent = KeyedParentComposition.makeUpdate({
  ClickedParent: model => ({ model }),
})

const Room = Schema.Struct({
  roomId: Schema.String,
  child: KeyedChildModel,
})
type Room = typeof Room.Type
const RoomParentModel = Schema.Struct({
  rooms: Schema.Array(Room),
  amount: Schema.Number,
})
type RoomParentModel = typeof RoomParentModel.Type
const RoomParentMessage = defineMessageUnion({ ClickedParent: {} })
type RoomParentMessage = typeof RoomParentMessage.Type
const RoomParentDefinition = makeDefinition('GeneratedRoomParent', {
  Model: RoomParentModel,
  Message: RoomParentMessage,
})
const readRooms = (model: RoomParentModel): ReadonlyArray<Room> => model.rooms
const roomId = (room: Room): string => room.roomId
const readRoomChild = (room: Room): KeyedChildModel => room.child
const RoomBinding = RoomParentDefinition.makeBinding(KeyedChildBlock, {
  readAll: readRooms,
  key: roomId,
  keySchema: Room.fields.roomId,
  read: readRoomChild,
  writeAt: (model, roomId, nextChild) =>
    modifyFields(model, {
      rooms: Array.map(room =>
        room.roomId === roomId
          ? modifyFields(room, { child: () => nextChild })
          : room,
      ),
    }),
  delivery: {
    toUpdateContext: model => [model.amount],
  },
})
const RoomParentComposition = RoomParentDefinition.makeComposition({
  bindings: [RoomBinding],
})
const updateRoomParent = RoomParentComposition.makeUpdate({
  ClickedParent: model => ({ model }),
})

const WrappedRoom = Schema.Struct({
  roomId: Schema.String,
  child: KeyedChildModel,
})
type WrappedRoom = typeof WrappedRoom.Type
const WrappedParentModel = Schema.Struct({
  rooms: Schema.Array(WrappedRoom),
  amount: Schema.Number,
})
type WrappedParentModel = typeof WrappedParentModel.Type
const WrappedParentMessage = defineMessageUnion({ ClickedParent: {} })
type WrappedParentMessage = typeof WrappedParentMessage.Type
const WrappedParentDefinition = makeDefinition('GeneratedWrappedParent', {
  Model: WrappedParentModel,
  Message: WrappedParentMessage,
})
const WrappedBinding = WrappedParentDefinition.makeBinding(KeyedChildBlock, {
  field: 'rooms',
  key: 'roomId',
  childField: 'child',
  delivery: {
    toUpdateContext: model => [model.amount],
  },
})
const WrappedParentComposition = WrappedParentDefinition.makeComposition({
  bindings: [WrappedBinding],
})
const updateWrappedParent = WrappedParentComposition.makeUpdate({
  ClickedParent: model => ({ model }),
})

it('routes generated contextual accessor delivery from the current parent Model', () => {
  const initial = AccessorParentModel.make({
    child: { count: 1 },
    amount: 3,
    isEnabled: true,
  })
  const message = AccessorBinding.embedView({
    slotId: 'child',
    model: initial.child,
  }).toParentMessage(ChildMessage.ClickedIncrement())

  expect(message).toEqual({
    _tag: 'GotGeneratedAccessorChildMessage',
    placement: 'GeneratedAccessorChild',
    generation: 0,
    message: ChildMessage.ClickedIncrement(),
  })
  expect(updateAccessorParent(initial, message).model.child.count).toBe(4)
  expect(
    updateAccessorParent(
      modifyFields(initial, { isEnabled: () => false }),
      message,
    ).model.child.count,
  ).toBe(1)
})

it('routes generated delivery to optional, defaulted and rest update context', () => {
  const initial = AccessorParentModel.make({
    child: { count: 1 },
    amount: 3,
    isEnabled: true,
  })
  const optionalMessage = optionalContextBinding
    .embedView({ slotId: 'optional', model: initial.child })
    .toParentMessage(ChildMessage.ClickedIncrement())
  const defaultMessage = defaultContextBinding
    .embedView({ slotId: 'default', model: initial.child })
    .toParentMessage(ChildMessage.ClickedIncrement())
  const restMessage = restContextBinding
    .embedView({ slotId: 'rest', model: initial.child })
    .toParentMessage(ChildMessage.ClickedIncrement())

  expect(
    updateContextVariantsParent(initial, optionalMessage).model.child.count,
  ).toBe(4)
  expect(
    updateContextVariantsParent(initial, defaultMessage).model.child.count,
  ).toBe(4)
  expect(
    updateContextVariantsParent(initial, restMessage).model.child.count,
  ).toBe(4)
})

it('derives keyed field envelopes and applies delivery context at the captured key', () => {
  const initial = KeyedParentModel.make({
    children: [
      { id: 'first', count: 1 },
      { id: 'blocked', count: 2 },
    ],
    amount: 4,
    isEnabled: true,
  })
  const message = KeyedBinding.embedView({
    slotId: 'child',
    key: 'first',
    model: Option.getOrThrow(Array.head(initial.children)),
  }).toParentMessage(ChildMessage.ClickedIncrement())
  const blockedMessage = KeyedBinding.embedView({
    slotId: 'blocked',
    key: 'blocked',
    model: Option.getOrThrow(Array.last(initial.children)),
  }).toParentMessage(ChildMessage.ClickedIncrement())

  expect(message).toEqual({
    _tag: 'GotGeneratedKeyedChildMessage',
    placement: 'GeneratedKeyedChild',
    generation: 0,
    key: 'first',
    message: ChildMessage.ClickedIncrement(),
  })
  expect(Schema.is(KeyedParentComposition.Message)(message)).toBe(true)
  expect(updateKeyedParent(initial, message).model.children).toEqual([
    { id: 'first', count: 5 },
    { id: 'blocked', count: 2 },
  ])
  expect(updateKeyedParent(initial, blockedMessage).model).toBe(initial)
  expectTypeOf(KeyedBinding.placement).toEqualTypeOf<'GeneratedKeyedChild'>()
})

it('uses an explicit key Schema for generated general keyed delivery', () => {
  const initial = RoomParentModel.make({
    rooms: [{ roomId: 'one', child: { id: 'child-one', count: 2 } }],
    amount: 5,
  })
  const message = RoomBinding.embedView({
    slotId: 'room',
    key: 'one',
    model: Option.getOrThrow(Array.head(initial.rooms)).child,
  }).toParentMessage(ChildMessage.ClickedIncrement())

  expect(Schema.is(RoomParentComposition.Message)(message)).toBe(true)
  expect(updateRoomParent(initial, message).model.rooms).toEqual([
    { roomId: 'one', child: { id: 'child-one', count: 7 } },
  ])
  expectTypeOf(message.key).toEqualTypeOf<string>()
})

it('validates generated selector keys against the decoded side of a transformed refinement', () => {
  const binding = Reflect.apply(RoomParentDefinition.makeBinding, undefined, [
    KeyedChildBlock,
    {
      readAll: readRooms,
      key: () => 1,
      keySchema: Schema.NumberFromString.check(Schema.isGreaterThan(0)),
      read: readRoomChild,
      writeAt: (model: RoomParentModel) => model,
      delivery: {
        toUpdateContext: (model: RoomParentModel) => [model.amount],
      },
    },
  ])
  const initial = RoomParentModel.make({
    rooms: [{ roomId: 'one', child: { id: 'child-one', count: 2 } }],
    amount: 5,
  })

  expect(runtimeBindingOf(binding).select(initial)).toEqual([
    { key: 1, model: { id: 'child-one', count: 2 } },
  ])
})

it('rejects an erased selector result outside the generated key Schema', () => {
  const binding = Reflect.apply(RoomParentDefinition.makeBinding, undefined, [
    KeyedChildBlock,
    {
      readAll: readRooms,
      key: () => 1,
      keySchema: Schema.String,
      read: readRoomChild,
      writeAt: (model: RoomParentModel) => model,
      delivery: {
        toUpdateContext: (model: RoomParentModel) => [model.amount],
      },
    },
  ])
  const initial = RoomParentModel.make({
    rooms: [{ roomId: 'one', child: { id: 'child-one', count: 2 } }],
    amount: 5,
  })

  expect(() => runtimeBindingOf(binding).select(initial)).toThrow(
    '[foldkit] Generated keyed child Binding "GeneratedKeyedChild" key selector returned a value that does not satisfy its key Schema.',
  )
})

it('derives wrapped keyed field envelopes from the wrapper key Schema', () => {
  const initial = WrappedParentModel.make({
    rooms: [{ roomId: 'one', child: { id: 'child-one', count: 2 } }],
    amount: 5,
  })
  const message = WrappedBinding.embedView({
    slotId: 'room',
    key: 'one',
    model: Option.getOrThrow(Array.head(initial.rooms)).child,
  }).toParentMessage(ChildMessage.ClickedIncrement())

  expect(message).toEqual({
    _tag: 'GotGeneratedKeyedChildMessage',
    placement: 'GeneratedKeyedChild',
    generation: 0,
    key: 'one',
    message: ChildMessage.ClickedIncrement(),
  })
  expect(Schema.is(WrappedParentComposition.Message)(message)).toBe(true)
  expect(updateWrappedParent(initial, message).model.rooms).toEqual([
    { roomId: 'one', child: { id: 'child-one', count: 7 } },
  ])
})

it('reports an invalid general keyed collection at the Binding boundary', () => {
  const binding = Reflect.apply(RoomParentDefinition.makeBinding, undefined, [
    KeyedChildBlock,
    {
      readAll: () => ({ roomId: 'not-an-array' }),
      key: roomId,
      keySchema: Room.fields.roomId,
      read: readRoomChild,
      writeAt: (model: RoomParentModel) => model,
      delivery: {
        toUpdateContext: (model: RoomParentModel) => [model.amount],
      },
    },
  ])

  expect(() =>
    runtimeBindingOf(binding).select(
      RoomParentModel.make({ rooms: [], amount: 1 }),
    ),
  ).toThrow(
    '[foldkit] Keyed child Binding "GeneratedKeyedChild" readAll must return an array.',
  )
})

it('rejects removed authored parent Message mapping fields', () => {
  for (const removedField of [
    'parentMessage',
    'toParentMessage',
    'fromParentMessage',
  ]) {
    expect(() =>
      Reflect.apply(AccessorParentDefinition.makeBinding, undefined, [
        AccessorChildBlock,
        {
          field: 'child',
          [removedField]: () => AccessorParentMessage.ClickedParent(),
          delivery: { toUpdateContext: () => [1] },
        },
      ]),
    ).toThrow(
      `[foldkit] Unknown Binding configuration field "${removedField}".`,
    )
  }

  expect(() =>
    Reflect.apply(RoomParentDefinition.makeBinding, undefined, [
      KeyedChildBlock,
      {
        readAll: readRooms,
        key: roomId,
        keySchema: Schema.Boolean,
        read: readRoomChild,
        writeAt: (model: RoomParentModel) => model,
        delivery: {
          toUpdateContext: (model: RoomParentModel) => [model.amount],
        },
      },
    ]),
  ).toThrow(
    '[foldkit] A generated general keyed Binding keySchema must decode to a string or number.',
  )
})

if (false) {
  AccessorParentDefinition.makeBinding(AccessorChildBlock, {
    // @ts-expect-error A missing delivery context makes the accessor config ineligible.
    read: (model: AccessorParentModel) => Option.some(model.child),
    // @ts-expect-error A missing delivery context makes the accessor config ineligible.
    write: (model: AccessorParentModel, child: AccessorChildModel) =>
      modifyFields(model, { child: () => child }),
    // @ts-expect-error Contextual generated delivery requires its context selector.
    delivery: {},
  })

  // @ts-expect-error General generated keyed delivery requires an exact key Schema.
  RoomParentDefinition.makeBinding(KeyedChildBlock, {
    readAll: readRooms,
    key: roomId,
    read: readRoomChild,
    writeAt: model => model,
    delivery: { toUpdateContext: model => [model.amount] },
  })
}
