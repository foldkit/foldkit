import { Array, Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
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
type HomeModel = typeof HomeModel.Type
const HomeMessage = defineMessageUnion({
  RequestedResetJoinForm: { username: Schema.String },
  RequestedJoin: { roomId: Schema.String, username: Schema.String },
  SucceededJoinRoom: { roomId: Schema.String, username: Schema.String },
  CompletedClearJoinDraft: {},
})
type HomeMessage = typeof HomeMessage.Type
const HomeOutMessage = defineMessageUnion({
  JoinedRoom: { roomId: Schema.String, username: Schema.String },
})
type HomeOutMessage = typeof HomeOutMessage.Type
const Home = Block.makeDefinition('Home', {
  Model: HomeModel,
  Message: HomeMessage,
  OutMessage: HomeOutMessage,
})
const ClearJoinDraft = Home.makeCommand('ClearJoinDraft', {
  messages: [HomeMessage.CompletedClearJoinDraft],
  handler: function* () {
    const store = yield* DraftStore
    return () =>
      store.clear.pipe(Effect.as(HomeMessage.CompletedClearJoinDraft()))
  },
})
const HomeComposition = Home.makeComposition()
const resetJoinFormStep = Home.makeStep((model, username: string) => ({
  model: modifyFields(model, {
    username: () => username,
    resetCount: count => count + 1,
  }),
  commands: [ClearJoinDraft()],
}))
const requestJoinStep = Home.makeStep(
  (model, roomId: string, username: string) => ({
    model,
    outMessage: HomeOutMessage.JoinedRoom({ roomId, username }),
  }),
)
const prepareHomeBlock = () =>
  HomeComposition.prepareBlock({
    init: HomeComposition.makeInit(() => ({
      model: HomeModel.make({ username: '', resetCount: 0 }),
    })),
    update: HomeComposition.makeUpdate({
      RequestedResetJoinForm: (model, { username }) =>
        resetJoinFormStep(model, username),
      RequestedJoin: (model, { roomId, username }) =>
        requestJoinStep(model, roomId, username),
      SucceededJoinRoom: (model, { roomId, username }) => ({
        model,
        outMessage: HomeOutMessage.JoinedRoom({ roomId, username }),
      }),
      CompletedClearJoinDraft: model => ({ model }),
    }),
    operations: {
      resetJoinForm: (username: string) =>
        Tuple.make(HomeMessage.RequestedResetJoinForm({ username })),
      requestJoin: (roomId: string, username: string) =>
        Tuple.make(HomeMessage.RequestedJoin({ roomId, username })),
    },
    EffectsLayer: ClearJoinDraft.layer,
  })
const HomeBlock: Block.FromAssemblyWithOutMessage<
  typeof HomeModel,
  typeof prepareHomeBlock
> = Block.assemble(prepareHomeBlock)

const RoomModel = Schema.Struct({ maybeUsername: Schema.Option(Schema.String) })
type RoomModel = typeof RoomModel.Type
const RoomContext = Schema.Struct({ roomId: Schema.String })
type RoomContext = typeof RoomContext.Type
const RoomMessage = defineMessageUnion({
  RequestedInformJoined: { username: Schema.String },
  CompletedLeaveRoom: {},
})
type RoomMessage = typeof RoomMessage.Type
const RoomOutMessage = defineMessageUnion({
  LeftRoom: { roomId: Schema.String },
})
type RoomOutMessage = typeof RoomOutMessage.Type
const Room = Block.makeDefinition('Room', {
  Model: RoomModel,
  Message: RoomMessage,
  OutMessage: RoomOutMessage,
})
const RoomComposition = Room.makeComposition()
const informJoinedStep = Room.makeStep(
  (model, username: string, _context: RoomContext) => ({
    model: modifyFields(model, { maybeUsername: () => Option.some(username) }),
  }),
)
const prepareRoomBlock = () =>
  RoomComposition.prepareBlock({
    init: RoomComposition.makeInit(() => ({
      model: RoomModel.make({ maybeUsername: Option.none() }),
    })),
    update: RoomComposition.makeUpdate.withContext((context: RoomContext) => ({
      RequestedInformJoined: (model, { username }) =>
        informJoinedStep(model, username, context),
      CompletedLeaveRoom: model => ({
        model,
        outMessage: RoomOutMessage.LeftRoom({ roomId: context.roomId }),
      }),
    })),
    operations: {
      informJoined: (username: string, context: RoomContext) =>
        Tuple.make(RoomMessage.RequestedInformJoined({ username }), context),
    },
    EffectsLayer: Layer.empty,
  })
const RoomBlock: Block.FromAssemblyWithOutMessage<
  typeof RoomModel,
  typeof prepareRoomBlock
> = Block.assemble(prepareRoomBlock)

const ApplicationRoute = defineRouteUnion({
  Home: {},
  Room: { roomId: Schema.String },
})
type ApplicationRoute = typeof ApplicationRoute.Type
const RoomInstance = Schema.Struct({ roomId: Schema.String, model: RoomModel })
type RoomInstance = typeof RoomInstance.Type
const Model = Schema.Struct({
  home: HomeModel,
  maybeRoomInstance: Schema.Option(RoomInstance),
  route: ApplicationRoute,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  RequestedJoin: { roomId: Schema.String, username: Schema.String },
  RequestedResetJoinForm: { username: Schema.String },
})
type Message = typeof Message.Type
const Application = Block.makeDefinition('ReciprocalApplication', {
  Model,
  Message,
})

const foldRoomOutMessage = Application.makeOutMessageFold(RoomBlock, {
  LeftRoom: () =>
    Update.combineSteps([
      Application.makeStep(model => ({
        model: modifyFields(model, {
          route: () => ApplicationRoute.Home(),
          maybeRoomInstance: () => Option.none(),
        }),
      })),
      HomeBinding.resetJoinForm(''),
    ]),
})

const foldHomeOutMessage = Application.makeOutMessageFold(HomeBlock, {
  JoinedRoom: ({ roomId, username }) =>
    Update.combineSteps([
      Application.makeStep(model =>
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
      Application.makeStep(model => ({
        model: modifyFields(model, {
          route: () => ApplicationRoute.Room({ roomId }),
        }),
      })),
    ]),
})

const HomeBinding = Application.makeBinding(HomeBlock, {
  field: 'home',
  presentWhen: model => model.route._tag === 'Home',
  init: false,
}).withOutMessagePolicy({
  fold: foldHomeOutMessage,
})

const RoomBinding = Application.makeBinding(RoomBlock, {
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
  keySchema: Schema.String,
  delivery: {
    when: (model, roomId) =>
      model.route._tag === 'Room' && model.route.roomId === roomId,
    toUpdateContext: (_model, roomId) => [{ roomId }],
  },
}).withOutMessagePolicy({
  fold: (_roomId, outMessage) => foldRoomOutMessage(outMessage),
})

const ApplicationComposition = Application.makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
const update = ApplicationComposition.makeUpdate({
  RequestedJoin: (model, { roomId, username }) =>
    HomeBinding.requestJoin(roomId, username)(model),
  RequestedResetJoinForm: (model, { username }) =>
    HomeBinding.resetJoinForm(username)(model),
})
const makeInitialModel = () =>
  Model.make({
    home: HomeModel.make({ username: 'Devin', resetCount: 0 }),
    maybeRoomInstance: Option.none(),
    route: ApplicationRoute.Home(),
  })
const directHomeRequestStep = HomeBinding.requestJoin('room-a', 'Devin')

// @ts-expect-error A raw recipe cannot erase its deferred Binding policy obligation.
const erasedDirectHomeRequestStep: (
  model: Parameters<typeof directHomeRequestStep>[0],
) => Update.ResultRecipe<
  Model,
  Parameters<typeof update>[1],
  never,
  Update.RequirementsOf<typeof directHomeRequestStep>,
  Block.RequirementOfBinding<typeof HomeBinding>
> = directHomeRequestStep

const widenedDirectHomeRequestStep: (
  model: Parameters<typeof directHomeRequestStep>[0],
) => Update.ResultRecipe<
  Model,
  Parameters<typeof update>[1],
  never,
  Update.RequirementsOf<typeof directHomeRequestStep>,
  unknown
> = directHomeRequestStep

// @ts-expect-error Composition init rejects a recipe whose Binding policy obligation was widened away.
ApplicationComposition.makeInit(() => ({
  model: makeInitialModel(),
  steps: [widenedDirectHomeRequestStep],
}))

void erasedDirectHomeRequestStep
const prepareApplicationBlock = () =>
  ApplicationComposition.prepareBlock({
    init: ApplicationComposition.makeInit(() => ({
      model: makeInitialModel(),
    })),
    update,
    operations: {
      requestJoin: (roomId: string, username: string) =>
        Tuple.make(Message.RequestedJoin({ roomId, username })),
      resetJoinForm: (username: string) =>
        Tuple.make(Message.RequestedResetJoinForm({ username })),
    },
  })
const ApplicationBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareApplicationBlock
> = Block.assemble(prepareApplicationBlock)
const joinRoom = (model: Model) =>
  update(model, {
    _tag: 'GotHomeMessage',
    placement: 'home',
    generation: 0,
    message: HomeMessage.SucceededJoinRoom({
      roomId: 'room-a',
      username: 'Devin',
    }),
  })
const leaveRoom = (model: Model, roomId = 'room-a') =>
  update(model, {
    _tag: 'GotRoomMessage',
    placement: 'Room',
    generation: 0,
    key: roomId,
    message: RoomMessage.CompletedLeaveRoom(),
  })

describe('reciprocal sibling coordination', () => {
  it.each([
    {
      name: 'missing',
      policy: undefined,
      error: 'requires withOutMessagePolicy before Composition registration',
    },
    {
      name: 'empty',
      policy: {},
      error: 'OutMessage policy requires fold or forward',
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
        'forwarding requires an OutMessage Schema on its parent Definition',
    },
  ])(
    'rejects $name OutMessage policy from erased configuration',
    ({ policy, error }) => {
      const binding = Reflect.apply(Application.makeBinding, undefined, [
        HomeBlock,
        { field: 'home' },
      ])

      expect(() => {
        const selectedBinding =
          policy === undefined
            ? binding
            : Reflect.apply(binding.withOutMessagePolicy, binding, [policy])
        Reflect.apply(Application.makeComposition, undefined, [
          { bindings: [selectedBinding] },
        ])
      }).toThrow(error)
    },
  )

  it('validates a policy without calling it during Binding construction', () => {
    const fold = vi.fn(() => Application.makeStep(model => ({ model })))

    const binding = Reflect.apply(Application.makeBinding, undefined, [
      HomeBlock,
      { field: 'home' },
    ])
    const selectedBinding = Reflect.apply(
      binding.withOutMessagePolicy,
      binding,
      [{ fold }],
    )
    Reflect.apply(Application.makeComposition, undefined, [
      { bindings: [selectedBinding] },
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
    expect(completed).toEqual({
      _tag: 'GotHomeMessage',
      placement: 'home',
      generation: 0,
      message: HomeMessage.CompletedClearJoinDraft(),
    })
    expect(update(left.model, completed).model).toEqual(left.model)
  })

  it('ignores stale Room results and a Home operation while Home is absent', () => {
    const joined = joinRoom(makeInitialModel())
    const stale = leaveRoom(joined.model, 'removed-room')
    const absentHome = ApplicationBlock.operations.resetJoinForm(
      joined.model,
      'ignored',
    )

    expect(stale.model).toBe(joined.model)
    expect(stale.commands ?? []).toHaveLength(0)
    expect(absentHome.model).toBe(joined.model)
    expect(absentHome.commands ?? []).toHaveLength(0)
  })

  it('retains the OutMessage policy for an operation that emits an OutMessage', () => {
    const joined = ApplicationBlock.operations.requestJoin(
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
