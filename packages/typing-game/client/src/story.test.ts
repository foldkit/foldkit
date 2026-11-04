import { Array, Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Url } from 'foldkit'
import {
  Command,
  given,
  inMessage,
  message,
  messageFrom,
  model,
  story,
  withBlock,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { it } from '@effect/vitest'
import * as Shared from '@typing-game/shared'

import { ApplicationBlock, layer } from './block'
import { HomeBlock, Room, RoomBlock } from './blocks'
import { HomeStep } from './blocks/home/model'
import {
  ClearSession,
  FetchRoom,
  FocusRoomPageUsernameInput,
  LoadSession,
  SavePlayerSession,
  StartGame,
} from './blocks/room/command'
import { InMessage as RoomInMessage } from './blocks/room/inMessage'
import { RoomAsyncData } from './blocks/room/model'
import { NavigateHome } from './blocks/room/update'
import {
  HomeBinding,
  MaybeRoomInstanceBinding,
  NavigateToRoom,
} from './composition'
import { Message } from './message'
import { Model, RoomInstance } from './model'
import { ApplicationRoute } from './route'
import { RoomsClient } from './rpc'

const application = { block: ApplicationBlock, layer }
const roomSubject = { block: RoomBlock, layer: Room.layer }

type HomeModel = typeof HomeBlock.Model.Type
type RoomModel = typeof RoomBlock.Model.Type
type HomeMessage = typeof HomeBlock.Message.Type
type RoomMessage = typeof RoomBlock.Message.Type

const ROOM_A = 'r1'
const ROOM_B = 'r2'

const alice = { id: 'p1', username: 'alice' }
const bob = { id: 'p2', username: 'bob' }

const waitingRoom: Shared.Room = {
  id: ROOM_A,
  players: [alice],
  hostId: alice.id,
  status: Shared.Waiting.make({}),
  maybeGame: Option.none(),
  maybeScoreboard: Option.none(),
  createdAt: 0,
  usedGameTexts: [],
}

const selectActionHome: HomeModel = {
  homeStep: HomeStep.SelectAction({
    username: 'alice',
    selectedAction: 'CreateRoom',
  }),
  formError: Option.none(),
}

const joinedRoom: RoomModel = {
  roomAsyncData: RoomAsyncData.Success({ data: waitingRoom }),
  maybeSession: Option.some({ roomId: ROOM_A, player: alice }),
  userGameText: '',
  charsTyped: 0,
  username: 'alice',
  isRoomIdCopyIndicatorVisible: false,
  exitCountdownSecondsLeft: 0,
}

const toHomeMessage = (message: HomeMessage) =>
  messageFrom(HomeBinding, message)

const toRoomMessage = (roomId: string, message: RoomMessage) =>
  messageFrom(MaybeRoomInstanceBinding, roomId, message)

const givenHomeRoute = given<Model>({
  route: ApplicationRoute.Home(),
  home: selectActionHome,
  maybeRoomInstance: Option.none(),
})

const givenRoomRoute = given<Model>({
  route: ApplicationRoute.Room({ roomId: ROOM_A }),
  home: selectActionHome,
  maybeRoomInstance: Option.some({ roomId: ROOM_A, model: joinedRoom }),
})

const roomUrl = (roomId: string): Url.Url =>
  pipe(
    Url.fromString(`https://typing-game.test/room/${roomId}`),
    Option.getOrThrow,
  )

const homeUrl = pipe(
  Url.fromString('https://typing-game.test/'),
  Option.getOrThrow,
)

const makeRoom = (roomId: string, createdAt: number): Shared.Room =>
  Shared.Room.make({
    id: roomId,
    players: [],
    hostId: '',
    status: Shared.Waiting.make({}),
    maybeGame: Option.none(),
    maybeScoreboard: Option.none(),
    createdAt,
    usedGameTexts: [],
  })

const getRoomInstance = (model: Model): RoomInstance =>
  pipe(model.maybeRoomInstance, Option.getOrThrow)

const dirtyRoomModel = (roomId: string) =>
  modifyFields(joinedRoom, {
    roomAsyncData: () => RoomAsyncData.Success({ data: makeRoom(roomId, 37) }),
    maybeSession: () => Option.some({ roomId, player: alice }),
    userGameText: () => 'typed text',
    charsTyped: () => 10,
    username: () => 'prior username',
    isRoomIdCopyIndicatorVisible: () => true,
    exitCountdownSecondsLeft: () => 4,
  })

const modelWithRoom = (
  route: Model['route'],
  roomId: string,
  roomModel = dirtyRoomModel(roomId),
): Model =>
  Model.make({
    route,
    home: selectActionHome,
    maybeRoomInstance: Option.some(
      RoomInstance.make({ roomId, model: roomModel }),
    ),
  })

describe('key presses on the Home route', () => {
  it.effect(
    'a Home key press moves the home selection and leaves the room alone',
    () => {
      return story(
        application,
        givenHomeRoute,
        toHomeMessage(HomeBlock.Message.PressedKey({ key: 'ArrowDown' })),
        model(model => {
          expect(model.home.homeStep).toMatchObject({
            _tag: 'SelectAction',
            selectedAction: 'JoinRoom',
          })
          expect(model.maybeRoomInstance).toEqual(Option.none())
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect('a Room key press does nothing', () => {
    return story(
      application,
      givenHomeRoute,
      toRoomMessage('r1', RoomBlock.Message.PressedKey({ key: 'Enter' })),
      model(model => {
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })
})

describe('key presses on the Room route', () => {
  it.effect('a Room key press starts the game and leaves home alone', () => {
    return story(
      application,
      givenRoomRoute,
      toRoomMessage('r1', RoomBlock.Message.PressedKey({ key: 'Enter' })),
      Command.resolve(StartGame, RoomBlock.Message.SucceededStartGame()),
      model(model => {
        expect(model.home).toEqual(selectActionHome)
      }),
    )
  })
})

describe('Room navigation', () => {
  test('changing Room routes replaces the child and starts the new Room load', async () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )
    const expectedRoomModel = await Effect.runPromise(
      withBlock(roomSubject, room => room.init(Option.some(ROOM_B)).model),
    )

    await Effect.runPromise(
      story(
        application,
        given(initialModel),
        message(Message.ChangedUrl({ url: roomUrl(ROOM_B) })),
        model(model => {
          expect(model.route).toEqual(ApplicationRoute.Room({ roomId: ROOM_B }))
          expect(getRoomInstance(model)).toEqual(
            RoomInstance.make({ roomId: ROOM_B, model: expectedRoomModel }),
          )
        }),
        Command.resolveAllExact(
          [
            LoadSession({ roomId: ROOM_B }),
            RoomBlock.Message.CompletedLoadSession({
              maybeSession: Option.none(),
            }),
          ],
          [
            FetchRoom({ roomId: ROOM_B }),
            RoomBlock.Message.SucceededFetchRoom({
              room: makeRoom(ROOM_B, 100),
            }),
          ],
          [
            FocusRoomPageUsernameInput,
            RoomBlock.Message.CompletedFocusRoomPageUsernameInput(),
          ],
        ),
      ),
    )
  })

  it.effect('leaving a Room removes its child Model', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )
    return story(
      application,
      given(initialModel),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Home())
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })

  it.effect('preserves the child Model on a same-Room URL', () => {
    const roomModel = dirtyRoomModel(ROOM_A)
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
      roomModel,
    )
    return story(
      application,
      given(initialModel),
      message(Message.ChangedUrl({ url: roomUrl(ROOM_A) })),
      model(model => {
        expect(getRoomInstance(model).model).toStrictEqual(roomModel)
      }),
      Command.expectNone(),
    )
  })
})

describe('Room occurrence identity', () => {
  it.effect('ignores stale child results after the active Room changes', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      ROOM_B,
    )
    const staleMessages: ReadonlyArray<RoomMessage> = [
      RoomBlock.Message.SucceededJoinRoom({ player: alice }),
      RoomBlock.Message.CompletedLoadSession({
        maybeSession: Option.some({ roomId: ROOM_A, player: alice }),
      }),
      RoomBlock.Message.SucceededFetchRoom({ room: makeRoom(ROOM_A, 90) }),
      RoomBlock.Message.UpdatedRoom({
        room: makeRoom(ROOM_A, 91),
        maybePlayerProgress: Option.none(),
      }),
      RoomBlock.Message.SucceededCopyRoomId(),
      RoomBlock.Message.CompletedWaitForExitCountdownInterval(),
    ]

    return Effect.forEach(
      staleMessages,
      staleMessage =>
        story(
          application,
          given(initialModel),
          toRoomMessage(ROOM_A, staleMessage),
          model(model => {
            expect(model).toBe(initialModel)
          }),
          Command.expectNone(),
        ),
      { discard: true },
    )
  })

  it.effect(
    'uses the originating Room ID when a payload contains another ID',
    () => {
      const mismatchedRoomModel = modifyFields(dirtyRoomModel(ROOM_A), {
        roomAsyncData: () =>
          RoomAsyncData.Success({
            data: { ...waitingRoom, id: 'payload-room' },
          }),
        exitCountdownSecondsLeft: () => 0,
      })
      const initialModel = modelWithRoom(
        ApplicationRoute.Room({ roomId: ROOM_A }),
        ROOM_A,
        mismatchedRoomModel,
      )
      return story(
        application,
        given(initialModel),
        toRoomMessage(
          ROOM_A,
          RoomBlock.Message.PressedKey({ key: 'Backspace' }),
        ),
        Command.resolveAllExact(
          [
            ClearSession({ roomId: ROOM_A }),
            RoomBlock.Message.CompletedClearSession(),
          ],
          [NavigateHome(), RoomBlock.Message.CompletedNavigateHome()],
        ),
      )
    },
  )

  it.effect(
    'starts the game in the originating Room when the payload ID differs',
    () => {
      const mismatchedRoomModel = modifyFields(dirtyRoomModel(ROOM_A), {
        roomAsyncData: () =>
          RoomAsyncData.Success({
            data: { ...waitingRoom, id: 'payload-room' },
          }),
      })
      const initialModel = modelWithRoom(
        ApplicationRoute.Room({ roomId: ROOM_A }),
        ROOM_A,
        mismatchedRoomModel,
      )
      return story(
        application,
        given(initialModel),
        toRoomMessage(ROOM_A, RoomBlock.Message.PressedKey({ key: 'Enter' })),
        Command.resolveAllExact([
          StartGame({ roomId: ROOM_A, playerId: alice.id }),
          RoomBlock.Message.SucceededStartGame(),
        ]),
      )
    },
  )
})

describe('Home and Room coordination', () => {
  it.effect(
    'received join uses its own room context and preserves the local completion path',
    () => {
      const session = { roomId: ROOM_B, player: bob }
      return story(
        {
          block: RoomBlock,
          layer: Room.layer,
          updateContext: [{ roomId: ROOM_A }],
          inMessageContext: [{ roomId: ROOM_B }],
        },
        given(joinedRoom),
        inMessage(RoomInMessage.InformedOfJoin({ player: bob })),
        model(model =>
          expect(model.maybeSession).toEqual(Option.some(session)),
        ),
        Command.expectHas(SavePlayerSession({ session })),
        Command.resolve(
          SavePlayerSession,
          RoomBlock.Message.CompletedSavePlayerSession(),
        ),
      )
    },
  )

  test('informJoin retains persistence and the canonical join transition', async () => {
    await Effect.runPromise(
      withBlock(roomSubject, room => {
        expectTypeOf<Layer.Services<typeof room.EffectsLayer>>().toEqualTypeOf<
          RoomsClient | KeyValueStore.KeyValueStore
        >()

        const informed = room.operations.informJoin(
          joinedRoom,
          { player: bob },
          { roomId: ROOM_A },
        )
        const joined = room.update(
          joinedRoom,
          RoomBlock.Message.SucceededJoinRoom({ player: bob }),
          { roomId: ROOM_A },
        )
        const expectedSession = { roomId: ROOM_A, player: bob }

        expect(informed.model).toEqual(joined.model)
        expect(informed.model.maybeSession).toEqual(
          Option.some(expectedSession),
        )
        expect(
          Array.map(informed.commands ?? [], Command.argsOf(SavePlayerSession)),
        ).toEqual([Option.some({ session: expectedSession })])
        expect(
          Array.map(joined.commands ?? [], Command.argsOf(SavePlayerSession)),
        ).toEqual([Option.some({ session: expectedSession })])
        expect(informed.outMessage).toBeUndefined()
      }),
    )
  })

  it.effect.each([
    {
      homeMessage: HomeBlock.Message.SucceededCreateRoom({
        roomId: ROOM_A,
        player: alice,
      }),
    },
    {
      homeMessage: HomeBlock.Message.SucceededJoinRoomFromHome({
        roomId: ROOM_A,
        player: alice,
      }),
    },
  ])('prepares a clean Room after Home succeeds (%#)', ({ homeMessage }) => {
    const priorRoomModel = dirtyRoomModel(ROOM_A)
    const initialModel = modelWithRoom(
      ApplicationRoute.Home(),
      ROOM_A,
      priorRoomModel,
    )

    return story(
      application,
      given(initialModel),
      toHomeMessage(homeMessage),
      model(model => {
        const roomInstance = getRoomInstance(model)

        expect(model.route).toEqual(ApplicationRoute.Home())
        expect(roomInstance.roomId).toBe(ROOM_A)
        expect(roomInstance.model).not.toBe(priorRoomModel)
        expect(roomInstance.model.roomAsyncData).toEqual(RoomAsyncData.Idle())
        expect(roomInstance.model.maybeSession).toEqual(
          Option.some({ roomId: ROOM_A, player: alice }),
        )
        expect(roomInstance.model.userGameText).toBe('')
        expect(roomInstance.model.charsTyped).toBe(0)
        expect(roomInstance.model.username).toBe('')
        expect(roomInstance.model.isRoomIdCopyIndicatorVisible).toBe(false)
        expect(roomInstance.model.exitCountdownSecondsLeft).toBe(0)
      }),
      Command.resolveAllExact(
        [
          SavePlayerSession({
            session: { roomId: ROOM_A, player: alice },
          }),
          RoomBlock.Message.CompletedSavePlayerSession(),
        ],
        [NavigateToRoom({ roomId: ROOM_A }), Message.CompletedNavigateToRoom()],
      ),
    )
  })

  it.effect('ignores a delayed Home result after entering another Room', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      ROOM_B,
    )
    return story(
      application,
      given(initialModel),
      toHomeMessage(
        HomeBlock.Message.SucceededCreateRoom({
          roomId: ROOM_A,
          player: bob,
        }),
      ),
      model(model => {
        expect(model).toBe(initialModel)
      }),
      Command.expectNone(),
    )
  })
})
