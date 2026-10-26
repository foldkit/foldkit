import { Array, Option, pipe } from 'effect'
import { Update, Url } from 'foldkit'
import type { HandlerOf } from 'foldkit/command'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, expectTypeOf, test } from 'vitest'

import * as Shared from '@typing-game/shared'

import { HomeBinding, NavigateToRoom, RoomBinding } from './composition'
import { Message } from './message'
import { Model, RoomInstance } from './model'
import { HomeBlock, RoomBlock } from './page'
import { HomeStep } from './page/home/model'
import {
  ClearSession,
  FetchRoom,
  FocusRoomPageUsernameInput,
  LoadSession,
  SavePlayerSession,
  StartGame,
} from './page/room/command'
import { RoomAsyncData } from './page/room/model'
import { NavigateHome } from './page/room/update'
import { ApplicationRoute } from './route'
import { update } from './update'

const ROOM_A = 'r1'
const ROOM_B = 'r2'

const alice = { id: 'p1', username: 'alice' }
const bob = { id: 'p2', username: 'bob' }

const waitingRoom: typeof Shared.Room.Type = {
  id: ROOM_A,
  players: [alice],
  hostId: alice.id,
  status: Shared.Waiting.make({}),
  maybeGame: Option.none(),
  maybeScoreboard: Option.none(),
  createdAt: 0,
  usedGameTexts: [],
}

const selectActionHome: typeof HomeBlock.Model.Type = {
  homeStep: HomeStep.SelectAction({
    username: 'alice',
    selectedAction: 'CreateRoom',
  }),
  formError: Option.none(),
}

const joinedRoom: typeof RoomBlock.Model.Type = {
  roomAsyncData: RoomAsyncData.Success({ data: waitingRoom }),
  maybeSession: Option.some({ roomId: ROOM_A, player: alice }),
  userGameText: '',
  charsTyped: 0,
  username: 'alice',
  isRoomIdCopyIndicatorVisible: false,
  exitCountdownSecondsLeft: 0,
}

const toHomeMessage = (message: typeof HomeBlock.Message.Type) =>
  toParentMessage(HomeBinding, message)

const toRoomMessage = (
  roomId: string,
  message: typeof RoomBlock.Message.Type,
) => toParentMessage(RoomBinding, roomId, message)

const givenHomeRoute = given<typeof Model.Type>({
  route: ApplicationRoute.Home(),
  home: selectActionHome,
  maybeRoomInstance: Option.none(),
})

const givenRoomRoute = given<typeof Model.Type>({
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

const makeRoom = (roomId: string, createdAt: number): typeof Shared.Room.Type =>
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

const getRoomInstance = (model: typeof Model.Type): typeof RoomInstance.Type =>
  pipe(model.maybeRoomInstance, Option.getOrThrow)

const dirtyRoomModel = (roomId: string) =>
  modifyFields(RoomBlock.init(Option.none()).model, {
    roomAsyncData: () => RoomAsyncData.Success({ data: makeRoom(roomId, 37) }),
    maybeSession: () => Option.some({ roomId, player: alice }),
    userGameText: () => 'typed text',
    charsTyped: () => 10,
    username: () => 'prior username',
    isRoomIdCopyIndicatorVisible: () => true,
    exitCountdownSecondsLeft: () => 4,
  })

const modelWithRoom = (
  route: (typeof Model.Type)['route'],
  roomId: string,
  roomModel = dirtyRoomModel(roomId),
): typeof Model.Type =>
  Model.make({
    route,
    home: selectActionHome,
    maybeRoomInstance: Option.some(
      RoomInstance.make({ roomId, model: roomModel }),
    ),
  })

describe('key presses on the Home route', () => {
  test('a Home key press moves the home selection and leaves the room alone', () => {
    story(
      update,
      givenHomeRoute,
      message(
        toHomeMessage(HomeBlock.Message.PressedKey({ key: 'ArrowDown' })),
      ),
      model(model => {
        expect(model.home.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })

  test('a Room key press does nothing', () => {
    story(
      update,
      givenHomeRoute,
      message(
        toRoomMessage('r1', RoomBlock.Message.PressedKey({ key: 'Enter' })),
      ),
      model(model => {
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })
})

describe('key presses on the Room route', () => {
  test('a Room key press starts the game and leaves home alone', () => {
    story(
      update,
      givenRoomRoute,
      message(
        toRoomMessage('r1', RoomBlock.Message.PressedKey({ key: 'Enter' })),
      ),
      Command.resolve(StartGame, RoomBlock.Message.SucceededStartGame()),
      model(model => {
        expect(model.home).toEqual(selectActionHome)
      }),
    )
  })
})

describe('Room navigation', () => {
  test('changing Room routes replaces the child and starts the new Room load', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )
    const expectedRoomInit = RoomBlock.init(Option.some(ROOM_B))

    story(
      update,
      given(initialModel),
      message(Message.ChangedUrl({ url: roomUrl(ROOM_B) })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Room({ roomId: ROOM_B }))
        expect(getRoomInstance(model)).toEqual(
          RoomInstance.make({ roomId: ROOM_B, model: expectedRoomInit.model }),
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
          RoomBlock.Message.SucceededFetchRoom({ room: makeRoom(ROOM_B, 100) }),
        ],
        [
          FocusRoomPageUsernameInput,
          RoomBlock.Message.CompletedFocusRoomPageUsernameInput(),
        ],
      ),
    )
  })

  test('leaving a Room removes its child Model', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )

    story(
      update,
      given(initialModel),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Home())
        expect(model.maybeRoomInstance).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })

  test('preserves the child Model on a same-Room URL', () => {
    const roomModel = dirtyRoomModel(ROOM_A)
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
      roomModel,
    )

    story(
      update,
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
  test('ignores stale child results after the active Room changes', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      ROOM_B,
    )
    const staleMessages: ReadonlyArray<typeof RoomBlock.Message.Type> = [
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

    for (const staleMessage of staleMessages) {
      story(
        update,
        given(initialModel),
        message(toRoomMessage(ROOM_A, staleMessage)),
        model(model => {
          expect(model).toBe(initialModel)
        }),
        Command.expectNone(),
      )
    }
  })

  test('uses the originating Room ID when a payload contains another ID', () => {
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

    story(
      update,
      given(initialModel),
      message(
        toRoomMessage(
          ROOM_A,
          RoomBlock.Message.PressedKey({ key: 'Backspace' }),
        ),
      ),
      Command.resolveAllExact(
        [
          ClearSession({ roomId: ROOM_A }),
          RoomBlock.Message.CompletedClearSession(),
        ],
        [NavigateHome(), RoomBlock.Message.CompletedNavigateHome()],
      ),
    )
  })

  test('starts the game in the originating Room when the payload ID differs', () => {
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

    story(
      update,
      given(initialModel),
      message(
        toRoomMessage(ROOM_A, RoomBlock.Message.PressedKey({ key: 'Enter' })),
      ),
      Command.resolveAllExact([
        StartGame({ roomId: ROOM_A, playerId: alice.id }),
        RoomBlock.Message.SucceededStartGame(),
      ]),
    )
  })
})

describe('Home and Room coordination', () => {
  test('informJoined retains its exact persistence requirement and the canonical join transition', () => {
    expectTypeOf<
      Update.RequirementsOf<typeof RoomBlock.operations.informJoined>
    >().toEqualTypeOf<HandlerOf<typeof SavePlayerSession>>()

    const informed = RoomBlock.operations.informJoined(
      joinedRoom,
      { player: bob },
      { roomId: ROOM_A },
    )
    const joined = RoomBlock.update(
      joinedRoom,
      RoomBlock.Message.SucceededJoinRoom({ player: bob }),
      { roomId: ROOM_A },
    )
    const expectedSession = { roomId: ROOM_A, player: bob }

    expect(informed.model).toEqual(joined.model)
    expect(informed.model.maybeSession).toEqual(Option.some(expectedSession))
    expect(
      Array.map(informed.commands ?? [], Command.argsOf(SavePlayerSession)),
    ).toEqual([Option.some({ session: expectedSession })])
    expect(
      Array.map(joined.commands ?? [], Command.argsOf(SavePlayerSession)),
    ).toEqual([Option.some({ session: expectedSession })])
    expect(informed.outMessage).toBeUndefined()
  })

  test.each([
    [
      'created',
      HomeBlock.Message.SucceededCreateRoom({ roomId: ROOM_A, player: alice }),
    ],
    [
      'joined',
      HomeBlock.Message.SucceededJoinRoomFromHome({
        roomId: ROOM_A,
        player: alice,
      }),
    ],
  ])('prepares a clean Room after Home has %s it', (_name, homeMessage) => {
    const priorRoomModel = dirtyRoomModel(ROOM_A)
    const initialModel = modelWithRoom(
      ApplicationRoute.Home(),
      ROOM_A,
      priorRoomModel,
    )

    story(
      update,
      given(initialModel),
      message(toHomeMessage(homeMessage)),
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

  test('ignores a delayed Home result after entering another Room', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      ROOM_B,
    )

    story(
      update,
      given(initialModel),
      message(
        toHomeMessage(
          HomeBlock.Message.SucceededCreateRoom({
            roomId: ROOM_A,
            player: bob,
          }),
        ),
      ),
      model(model => {
        expect(model).toBe(initialModel)
      }),
      Command.expectNone(),
    )
  })
})
