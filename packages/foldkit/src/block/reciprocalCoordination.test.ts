import { Array, Context, Effect, Layer, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { defineRouteUnion } from '../route/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import * as Block from './public.js'

class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{ clear: Effect.Effect<void> }>
>()('ReciprocalDraftStore') {}
const HomeModel = Schema.Struct({
  username: Schema.String,
  resetCount: Schema.Number,
})
const HomeMessage = defineMessageUnion({
  SucceededJoinRoom: { roomId: Schema.String, username: Schema.String },
  CompletedClearJoinDraft: {},
})
const HomeOutMessage = defineMessageUnion({
  JoinedRoom: { roomId: Schema.String, username: Schema.String },
})
const Home = Block.define('Home', {
  Model: HomeModel,
  Message: HomeMessage,
  OutMessage: HomeOutMessage,
})
const ClearJoinDraft = Home.command('ClearJoinDraft', {
  messages: [HomeMessage.CompletedClearJoinDraft],
  handler: function* () {
    const store = yield* DraftStore
    return () =>
      store.clear.pipe(Effect.as(HomeMessage.CompletedClearJoinDraft()))
  },
})
const HomeComposition = Home.makeComposition()
const resetJoinForm = Home.step((model, username: string) => ({
  model: modifyFields(model, {
    username: () => username,
    resetCount: count => count + 1,
  }),
  commands: [ClearJoinDraft()],
}))
const requestJoin = Home.step((model, roomId: string, username: string) => ({
  model,
  outMessage: HomeOutMessage.JoinedRoom({ roomId, username }),
}))
const HomeBlock = HomeComposition.makeBlock({
  init: HomeComposition.makeInit(() => ({
    model: HomeModel.make({ username: '', resetCount: 0 }),
  })),
  update: HomeComposition.makeUpdate((model, message) =>
    HomeMessage.match(message, {
      SucceededJoinRoom: ({ roomId, username }) => ({
        model,
        outMessage: HomeOutMessage.JoinedRoom({ roomId, username }),
      }),
      CompletedClearJoinDraft: () => ({ model }),
    }),
  ),
  expose: { resetJoinForm, requestJoin },
  EffectsLayer: ClearJoinDraft.layer,
})

const RoomModel = Schema.Struct({ maybeUsername: Schema.Option(Schema.String) })
const RoomContext = Schema.Struct({ roomId: Schema.String })
const RoomMessage = defineMessageUnion({ CompletedLeaveRoom: {} })
const RoomOutMessage = defineMessageUnion({
  LeftRoom: { roomId: Schema.String },
})
const Room = Block.define('Room', {
  Model: RoomModel,
  Message: RoomMessage,
  OutMessage: RoomOutMessage,
})
const RoomComposition = Room.makeComposition()
const informJoined = Room.step(
  (model, username: string, _context: typeof RoomContext.Type) => ({
    model: modifyFields(model, { maybeUsername: () => Option.some(username) }),
  }),
)
const RoomBlock = RoomComposition.makeBlock({
  init: RoomComposition.makeInit(() => ({
    model: RoomModel.make({ maybeUsername: Option.none() }),
  })),
  update: RoomComposition.makeUpdate(
    (model, message, context: typeof RoomContext.Type) =>
      RoomMessage.match(message, {
        CompletedLeaveRoom: () => ({
          model,
          outMessage: RoomOutMessage.LeftRoom({ roomId: context.roomId }),
        }),
      }),
  ),
  expose: { informJoined },
  EffectsLayer: Layer.empty,
})

const ApplicationRoute = defineRouteUnion({
  Home: {},
  Room: { roomId: Schema.String },
})
const RoomInstance = Schema.Struct({ roomId: Schema.String, model: RoomModel })
const Model = Schema.Struct({
  home: HomeModel,
  maybeRoomInstance: Schema.Option(RoomInstance),
  route: ApplicationRoute,
})
const Message = defineMessageUnion({
  GotHomeMessage: { message: HomeMessage },
  GotRoomMessage: { roomId: Schema.String, message: RoomMessage },
})
const Application = Block.define('ReciprocalApplication', { Model, Message })

const foldRoomOutMessage = (
  _roomId: string,
  outMessage: typeof RoomOutMessage.Type,
) =>
  RoomOutMessage.match(outMessage, {
    LeftRoom: () =>
      Update.combine([
        Application.step(model => ({
          model: modifyFields(model, {
            route: () => ApplicationRoute.Home(),
            maybeRoomInstance: () => Option.none(),
          }),
        })),
        HomeBinding.resetJoinForm(''),
      ]),
  })

const HomeBinding = Application.bindChild(HomeBlock, {
  field: 'home',
  presentWhen: model => model.route._tag === 'Home',
  parentMessage: Message.GotHomeMessage,
  init: false,
  outMessage: {
    fold: HomeOutMessage.match({
      JoinedRoom: ({ roomId, username }) =>
        Update.combine([
          Application.step(model =>
            RoomBinding.init({
              key: roomId,
              args: [],
              toParentModel: room =>
                modifyFields(model, {
                  maybeRoomInstance: () =>
                    Option.some(RoomInstance.make({ roomId, model: room })),
                }),
            }),
          ),
          RoomBinding.informJoined(roomId, username, { roomId }),
          Application.step(model => ({
            model: modifyFields(model, {
              route: () => ApplicationRoute.Room({ roomId }),
            }),
          })),
        ]),
    }),
  },
})

const RoomBinding = Application.bindChild(RoomBlock, {
  readAll: model => Option.toArray(model.maybeRoomInstance),
  key: instance => instance.roomId,
  read: instance => instance.model,
  writeAt: (model, roomId, nextRoom) =>
    modifyFields(model, {
      maybeRoomInstance: Option.map(instance =>
        instance.roomId === roomId
          ? modifyFields(instance, { model: () => nextRoom })
          : instance,
      ),
    }),
  toParentMessage: (roomId, message) =>
    Message.GotRoomMessage({ roomId, message }),
  fromParentMessage: {
    parentMessage: Message.GotRoomMessage,
    args: (model, { roomId, message }) =>
      model.route._tag === 'Room' && model.route.roomId === roomId
        ? Option.some([roomId, message, { roomId }])
        : Option.none(),
  },
  outMessage: {
    fold: foldRoomOutMessage,
  },
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [HomeBinding, RoomBinding],
})
const update = ApplicationComposition.makeUpdate()
const requestJoinThroughApplication = Application.step(
  (_model, roomId: string, username: string) =>
    HomeBinding.requestJoin(roomId, username),
)

const makeInitialModel = () =>
  Model.make({
    home: HomeModel.make({ username: 'Devin', resetCount: 0 }),
    maybeRoomInstance: Option.none(),
    route: ApplicationRoute.Home(),
  })
const ApplicationBlock = ApplicationComposition.makeBlock({
  init: ApplicationComposition.makeInit(() => ({ model: makeInitialModel() })),
  update,
  expose: {
    requestJoin: requestJoinThroughApplication,
    resetJoinForm: Application.step((_model, username: string) =>
      HomeBinding.resetJoinForm(username),
    ),
  },
})
const joinRoom = (model: typeof Model.Type) =>
  update(
    model,
    Message.GotHomeMessage({
      message: HomeMessage.SucceededJoinRoom({
        roomId: 'room-a',
        username: 'Devin',
      }),
    }),
  )
const leaveRoom = (model: typeof Model.Type, roomId = 'room-a') =>
  update(
    model,
    Message.GotRoomMessage({
      roomId,
      message: RoomMessage.CompletedLeaveRoom(),
    }),
  )

describe('reciprocal sibling coordination', () => {
  it.each([
    {
      name: 'missing',
      policy: undefined,
      error: 'requires an outMessage policy with a fold or forward function',
    },
    {
      name: 'empty',
      policy: {},
      error: 'An OutMessage policy requires a fold or forward function',
    },
    {
      name: 'non-callable',
      policy: { fold: 1 },
      error: 'outMessage.fold must be a function',
    },
    {
      name: 'forwarding without a parent contract',
      policy: { forward: () => undefined },
      error:
        'outMessage.forward requires an OutMessage Schema on the parent Definition',
    },
  ])(
    'rejects $name OutMessage policy from erased configuration',
    ({ policy, error }) => {
      const config = {
        field: 'home',
        parentMessage: Message.GotHomeMessage,
        ...(policy === undefined ? {} : { outMessage: policy }),
      }

      expect(() =>
        Reflect.apply(Application.bindChild, undefined, [HomeBlock, config]),
      ).toThrow(error)
    },
  )

  it('validates a policy without calling it during Binding construction', () => {
    const fold = vi.fn(() => Application.step(model => ({ model })))

    Reflect.apply(Application.bindChild, undefined, [
      HomeBlock,
      {
        field: 'home',
        parentMessage: Message.GotHomeMessage,
        outMessage: { fold },
      },
    ])

    expect(fold).not.toHaveBeenCalled()
  })

  it('keeps construction passive and coordinates Home into a keyed Room', () => {
    const initialModel = makeInitialModel()
    expect(initialModel.home.resetCount).toBe(0)
    expect(initialModel.maybeRoomInstance).toEqual(Option.none())

    const joined = joinRoom(initialModel)

    expect(joined.model.route).toEqual(
      ApplicationRoute.Room({ roomId: 'room-a' }),
    )
    expect(joined.model.maybeRoomInstance).toEqual(
      Option.some(
        RoomInstance.make({
          roomId: 'room-a',
          model: RoomModel.make({ maybeUsername: Option.some('Devin') }),
        }),
      ),
    )
    expect(joined.model.home.resetCount).toBe(0)
    expect(joined.commands ?? []).toHaveLength(0)
  })

  it('returns Home before its guarded operation and retains the lifted Command', async () => {
    const clear = vi.fn()
    const joined = joinRoom(makeInitialModel())
    const left = leaveRoom(joined.model)

    expect(left.model.route).toEqual(ApplicationRoute.Home())
    expect(left.model.maybeRoomInstance).toEqual(Option.none())
    expect(left.model.home).toEqual(
      HomeModel.make({ username: '', resetCount: 1 }),
    )
    expect(left.commands).toHaveLength(1)
    expect(clear).not.toHaveBeenCalled()
    expectTypeOf(left.model).toEqualTypeOf<typeof Model.Type>()

    const command = Option.getOrThrow(Array.head(left.commands ?? []))
    const completed = await Effect.runPromise(
      command.effect.pipe(
        Effect.provide(ApplicationBlock.EffectsLayer),
        Effect.provideService(DraftStore, { clear: Effect.sync(clear) }),
      ),
    )

    expect(clear).toHaveBeenCalledTimes(1)
    expect(completed).toEqual(
      Message.GotHomeMessage({
        message: HomeMessage.CompletedClearJoinDraft(),
      }),
    )
    expect(update(left.model, completed).model).toEqual(left.model)
  })

  it('ignores stale Room results and a Home operation while Home is absent', () => {
    const joined = joinRoom(makeInitialModel())
    const stale = leaveRoom(joined.model, 'removed-room')
    const absentHome = ApplicationBlock.expose.resetJoinForm(
      joined.model,
      'ignored',
    )

    expect(stale.model).toBe(joined.model)
    expect(stale.commands ?? []).toHaveLength(0)
    expect(absentHome.model).toBe(joined.model)
    expect(absentHome.commands ?? []).toHaveLength(0)
  })

  it('retains the OutMessage policy for an operation that emits an OutMessage', () => {
    const joined = ApplicationBlock.expose.requestJoin(
      makeInitialModel(),
      'requested-room',
      'Sam',
    )

    expect(joined.model.route).toEqual(
      ApplicationRoute.Room({ roomId: 'requested-room' }),
    )
    expect(joined.model.maybeRoomInstance).toEqual(
      Option.some(
        RoomInstance.make({
          roomId: 'requested-room',
          model: RoomModel.make({ maybeUsername: Option.some('Sam') }),
        }),
      ),
    )
    expect(joined.outMessage).toBeUndefined()
  })

  it('does not bounce a non-emitting sibling operation back through its policy', () => {
    const joined = joinRoom(makeInitialModel())
    const left = leaveRoom(joined.model)
    const repeated = leaveRoom(left.model)

    expect(left.model.home.resetCount).toBe(1)
    expect(repeated.model).toBe(left.model)
    expect(repeated.commands ?? []).toHaveLength(0)
  })
})
