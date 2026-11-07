import { Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Story, Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'
import * as Shared from '@typing-game/shared'

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
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { Model, RoomInstance } from './model'
import { ApplicationRoute } from './route'
import { RoomsClient } from './rpc'

const application = { block: ApplicationBlock, layer }
const roomSubject = { block: RoomBlock, layer: Room.layer }

type HomeModel = typeof HomeBlock.Model.Type
type RoomModel = typeof RoomBlock.Model.Type
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

const givenHomeRoute = Story.given<Model>({
  route: ApplicationRoute.Home(),
  home: selectActionHome,
  maybeRoomInstance: Option.none(),
})

const givenRoomRoute = Story.given<Model>({
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
      return Story.story(
        application,
        givenHomeRoute,
        Story.messageIn(
          HomeBinding,
          HomeBlock.Message.PressedKey({ key: 'ArrowDown' }),
        ),
        Story.model(model => {
          expect(model.home.homeStep).toMatchObject({
            _tag: 'SelectAction',
            selectedAction: 'JoinRoom',
          })
          expect(model.maybeRoomInstance).toEqual(Option.none())
        }),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect('a Room key press does nothing', () => {
    return Story.story(
      application,
      givenHomeRoute,
      Story.messageIn(
        MaybeRoomInstanceBinding,
        'r1',
        RoomBlock.Message.PressedKey({ key: 'Enter' }),
      ),
      Story.model(model => {
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Story.Command.expectNone(),
    )
  })
})

describe('key presses on the Room route', () => {
  it.effect('a Room key press starts the game and leaves home alone', () => {
    return Story.story(
      application,
      givenRoomRoute,
      Story.messageIn(
        MaybeRoomInstanceBinding,
        'r1',
        RoomBlock.Message.PressedKey({ key: 'Enter' }),
      ),
      Story.Command.resolve(StartGame, RoomBlock.Message.SucceededStartGame()),
      Story.model(model => {
        expect(model.home).toEqual(selectActionHome)
      }),
    )
  })
})

describe('Room navigation', () => {
  it.effect(
    'changing Room routes replaces the child and starts the new Room load',
    () =>
      Effect.gen(function* () {
        const initialModel = modelWithRoom(
          ApplicationRoute.Room({ roomId: ROOM_A }),
          ROOM_A,
        )
        const expectedRoomModel = yield* Story.withBlock(
          roomSubject,
          room => room.init(Option.some(ROOM_B)).model,
        )

        yield* Story.story(
          application,
          Story.given(initialModel),
          Story.message(Message.ChangedUrl({ url: roomUrl(ROOM_B) })),
          Story.model(model => {
            expect(model.route).toEqual(
              ApplicationRoute.Room({ roomId: ROOM_B }),
            )
            expect(getRoomInstance(model)).toEqual(
              RoomInstance.make({ roomId: ROOM_B, model: expectedRoomModel }),
            )
          }),
          Story.Command.resolveAllExact(
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
        )
      }),
  )

  it.effect('leaving a Room removes its child Model', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )
    return Story.story(
      application,
      Story.given(initialModel),
      Story.message(Message.ChangedUrl({ url: homeUrl })),
      Story.model(model => {
        expect(model.route).toEqual(ApplicationRoute.Home())
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Story.Command.expectNone(),
    )
  })

  it.effect('preserves the child Model on a same-Room URL', () => {
    const roomModel = dirtyRoomModel(ROOM_A)
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
      roomModel,
    )
    return Story.story(
      application,
      Story.given(initialModel),
      Story.message(Message.ChangedUrl({ url: roomUrl(ROOM_A) })),
      Story.model(model => {
        expect(getRoomInstance(model).model).toStrictEqual(roomModel)
      }),
      Story.Command.expectNone(),
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
        Story.story(
          application,
          Story.given(initialModel),
          Story.messageIn(MaybeRoomInstanceBinding, ROOM_A, staleMessage),
          Story.model(model => {
            expect(model).toBe(initialModel)
          }),
          Story.Command.expectNone(),
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
      return Story.story(
        application,
        Story.given(initialModel),
        Story.messageIn(
          MaybeRoomInstanceBinding,
          ROOM_A,
          RoomBlock.Message.PressedKey({ key: 'Backspace' }),
        ),
        Story.Command.resolveAllExact(
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
      return Story.story(
        application,
        Story.given(initialModel),
        Story.messageIn(
          MaybeRoomInstanceBinding,
          ROOM_A,
          RoomBlock.Message.PressedKey({ key: 'Enter' }),
        ),
        Story.Command.resolveAllExact([
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
      return Story.story(
        {
          block: RoomBlock,
          layer: Room.layer,
          updateContext: [{ roomId: ROOM_A }],
          inMessageContext: [{ roomId: ROOM_B }],
        },
        Story.given(joinedRoom),
        Story.inMessage(RoomInMessage.InformedOfJoin({ player: bob })),
        Story.model(model =>
          expect(model.maybeSession).toEqual(Option.some(session)),
        ),
        Story.Command.expectHas(SavePlayerSession({ session })),
        Story.Command.resolve(
          SavePlayerSession,
          RoomBlock.Message.CompletedSavePlayerSession(),
        ),
      )
    },
  )

  it.effect(
    'informOfJoin retains persistence and the canonical join transition',
    () =>
      Effect.gen(function* () {
        expectTypeOf<
          Layer.Services<Story.TestBlock<typeof roomSubject>['EffectsLayer']>
        >().toEqualTypeOf<RoomsClient | KeyValueStore.KeyValueStore>()

        const expectedSession = { roomId: ROOM_A, player: bob }
        const informedModel = yield* Story.story(
          {
            ...roomSubject,
            updateContext: [{ roomId: ROOM_A }],
            inMessageContext: [{ roomId: ROOM_A }],
          },
          Story.given(joinedRoom),
          Story.inMessage(RoomInMessage.InformedOfJoin({ player: bob })),
          Story.model(model => {
            expect(model.maybeSession).toEqual(Option.some(expectedSession))
          }),
          Story.Command.expectExact(
            SavePlayerSession({ session: expectedSession }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.resolve(
            SavePlayerSession,
            RoomBlock.Message.CompletedSavePlayerSession(),
          ),
        )

        yield* Story.story(
          {
            ...roomSubject,
            updateContext: [{ roomId: ROOM_A }],
            inMessageContext: [{ roomId: ROOM_A }],
          },
          Story.given(joinedRoom),
          Story.message(RoomBlock.Message.SucceededJoinRoom({ player: bob })),
          Story.model(model => expect(model).toEqual(informedModel)),
          Story.Command.expectExact(
            SavePlayerSession({ session: expectedSession }),
          ),
          Story.Command.resolve(
            SavePlayerSession,
            RoomBlock.Message.CompletedSavePlayerSession(),
          ),
        )
      }),
  )

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

    return Story.story(
      application,
      Story.given(initialModel),
      Story.messageIn(HomeBinding, homeMessage),
      Story.model(model => {
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
      Story.Command.resolveAllExact(
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
    return Story.story(
      application,
      Story.given(initialModel),
      Story.messageIn(
        HomeBinding,
        HomeBlock.Message.SucceededCreateRoom({
          roomId: ROOM_A,
          player: bob,
        }),
      ),
      Story.model(model => {
        expect(model).toBe(initialModel)
      }),
      Story.Command.expectNone(),
    )
  })
})
