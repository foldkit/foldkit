import { Array, Option, pipe } from 'effect'
import { Url } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import * as Shared from '@typing-game/shared'

import { NavigateToRoom } from './composition'
import { init } from './init'
import { Message } from './message'
import { Model, RoomInstance } from './model'
import { Home as HomePage, Room } from './page'
import { Message as HomeMessage } from './page/home/message'
import {
  ClearSession,
  FetchRoom,
  LoadSession,
  SavePlayerSession,
  StartGame,
} from './page/room/command'
import { Message as RoomMessage } from './page/room/message'
import { RoomAsyncData } from './page/room/model'
import { NavigateHome } from './page/room/update'
import { ApplicationRoute } from './route'
import { update } from './update'

const ROOM_A = 'room-a'
const ROOM_B = 'room-b'

const playerA = Shared.Player.make({ id: 'player-a', username: 'alice' })
const playerB = Shared.Player.make({ id: 'player-b', username: 'bob' })

const makeRoom = (
  roomId: string,
  createdAt: number,
  hostId = '',
): Shared.Room =>
  Shared.Room.make({
    id: roomId,
    players: [],
    hostId,
    status: Shared.Waiting.make({}),
    maybeGame: Option.none(),
    maybeScoreboard: Option.none(),
    createdAt,
    usedGameTexts: [],
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

const notFoundUrl = pipe(
  Url.fromString('https://typing-game.test/missing'),
  Option.getOrThrow,
)

const getRoomInstance = (model: Model): RoomInstance =>
  pipe(model.maybeRoomInstance, Option.getOrThrow)

const keyedRoomCommandName = (roomId: string, commandName: string): string =>
  commandName.replace('Room', `Room[${JSON.stringify(roomId)}]`)

const dirtyRoomModel = (roomId: string) => {
  const roomInit = Room.block.init(Option.none())

  return modifyFields(roomInit.model, {
    roomAsyncData: () => RoomAsyncData.Success({ data: makeRoom(roomId, 37) }),
    maybeSession: () => Option.some({ roomId, player: playerA }),
    userGameText: () => 'typed text',
    charsTyped: () => 10,
    username: () => 'prior username',
    isRoomIdCopyIndicatorVisible: () => true,
    exitCountdownSecondsLeft: () => 4,
  })
}

const modelWithRoom = (
  route: Model['route'],
  roomId: string,
  roomModel = dirtyRoomModel(roomId),
): Model =>
  Model.make({
    route,
    home: HomePage.block.init().model,
    maybeRoomInstance: Option.some(
      RoomInstance.make({ roomId, model: roomModel }),
    ),
  })

const commandRecords = (
  commands:
    | ReadonlyArray<Readonly<{ name: string; args?: Record<string, unknown> }>>
    | undefined,
): ReadonlyArray<
  Readonly<{ name: string; args: Record<string, unknown> | undefined }>
> =>
  pipe(
    commands ?? [],
    Array.map(command => ({ name: command.name, args: command.args })),
  )

describe('Room route transitions', () => {
  test('replaces Room A with a clean Room B and starts B loading', () => {
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )
    const result = update(model, Message.ChangedUrl({ url: roomUrl(ROOM_B) }))
    const expectedRoomInit = Room.block.init(Option.some(ROOM_B))

    expect(result.model.route).toEqual(
      ApplicationRoute.Room({ roomId: ROOM_B }),
    )
    expect(getRoomInstance(result.model)).toEqual(
      RoomInstance.make({ roomId: ROOM_B, model: expectedRoomInit.model }),
    )
    expect(commandRecords(result.commands)).toEqual([
      {
        name: keyedRoomCommandName(ROOM_B, LoadSession.name),
        args: { roomId: ROOM_B },
      },
      {
        name: keyedRoomCommandName(ROOM_B, FetchRoom.name),
        args: { roomId: ROOM_B },
      },
    ])
  })

  test('initializes a direct Room B visit with B loading Commands', () => {
    const result = init(roomUrl(ROOM_B))
    const expectedRoomInit = Room.block.init(Option.some(ROOM_B))

    expect(result.model.route).toEqual(
      ApplicationRoute.Room({ roomId: ROOM_B }),
    )
    expect(getRoomInstance(result.model)).toEqual(
      RoomInstance.make({ roomId: ROOM_B, model: expectedRoomInit.model }),
    )
    expect(
      commandRecords('commands' in result ? result.commands : undefined),
    ).toEqual([
      {
        name: keyedRoomCommandName(ROOM_B, LoadSession.name),
        args: { roomId: ROOM_B },
      },
      {
        name: keyedRoomCommandName(ROOM_B, FetchRoom.name),
        args: { roomId: ROOM_B },
      },
    ])
  })

  test.each([
    ['Home', homeUrl, ApplicationRoute.Home()],
    ['NotFound', notFoundUrl, ApplicationRoute.NotFound({ path: '/missing' })],
  ])('removes the Room slot on %s', (_name, url, route) => {
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
    )
    const result = update(model, Message.ChangedUrl({ url }))

    expect(result.model.route).toEqual(route)
    expect(result.model.maybeRoomInstance).toEqual(Option.none())
    expect(result.commands).toBeUndefined()
  })

  test('preserves Room state for a same-Room URL', () => {
    const roomModel = dirtyRoomModel(ROOM_A)
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
      roomModel,
    )
    const storedRoomModel = getRoomInstance(model).model
    const result = update(model, Message.ChangedUrl({ url: roomUrl(ROOM_A) }))

    expect(getRoomInstance(result.model).model).toBe(storedRoomModel)
    expect(result.commands).toBeUndefined()
  })
})

describe('Room Message identity', () => {
  test('ignores stale Room A results while Room B is active', () => {
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      ROOM_B,
    )
    const staleMessages: ReadonlyArray<typeof RoomMessage.Type> = [
      RoomMessage.SucceededJoinRoom({ player: playerA }),
      RoomMessage.CompletedLoadSession({
        maybeSession: Option.some({ roomId: ROOM_A, player: playerA }),
      }),
      RoomMessage.SucceededFetchRoom({ room: makeRoom(ROOM_A, 90) }),
      RoomMessage.UpdatedRoom({
        room: makeRoom(ROOM_A, 91),
        maybePlayerProgress: Option.none(),
      }),
      RoomMessage.SucceededCopyRoomId(),
      RoomMessage.CompletedWaitForExitCountdownInterval(),
    ]

    for (const message of staleMessages) {
      const result = update(
        model,
        Message.GotRoomMessage({ roomId: ROOM_A, message }),
      )

      expect(result.model).toBe(model)
      expect(result.commands).toBeUndefined()
    }
  })

  test('ignores a prepared Room slot until its Room Route becomes active', () => {
    const model = modelWithRoom(ApplicationRoute.Home(), ROOM_A)
    const result = update(
      model,
      Message.GotRoomMessage({
        roomId: ROOM_A,
        message: RoomMessage.SucceededFetchRoom({
          room: makeRoom(ROOM_A, 92),
        }),
      }),
    )

    expect(result.model).toBe(model)
    expect(result.commands).toBeUndefined()
  })

  test('accepts a Room B join result and stores a Room B session', () => {
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      ROOM_B,
    )
    const result = update(
      model,
      Message.GotRoomMessage({
        roomId: ROOM_B,
        message: RoomMessage.SucceededJoinRoom({ player: playerB }),
      }),
    )

    expect(getRoomInstance(result.model).model.maybeSession).toEqual(
      Option.some({ roomId: ROOM_B, player: playerB }),
    )
    expect(commandRecords(result.commands)).toEqual([
      {
        name: keyedRoomCommandName(ROOM_B, SavePlayerSession.name),
        args: { session: { roomId: ROOM_B, player: playerB } },
      },
    ])
  })

  test.each([
    ['Room B', ApplicationRoute.Room({ roomId: ROOM_B })],
    ['NotFound', ApplicationRoute.NotFound({ path: '/missing' })],
  ])('ignores a delayed Home result on %s', (_name, route) => {
    const model = modelWithRoom(route, ROOM_B)
    const result = update(
      model,
      Message.GotHomeMessage({
        message: HomeMessage.SucceededCreateRoom({
          roomId: ROOM_A,
          player: playerA,
        }),
      }),
    )

    expect(result.model).toBe(model)
    expect(result.commands).toBeUndefined()
  })
})

describe('Room payload identity', () => {
  test('uses the captured Room key when leaving a mismatched payload Room', () => {
    const payloadRoom = makeRoom('payload-room', 40, playerA.id)
    const roomModel = modifyFields(dirtyRoomModel(ROOM_A), {
      roomAsyncData: () => RoomAsyncData.Success({ data: payloadRoom }),
      exitCountdownSecondsLeft: () => 0,
    })
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
      roomModel,
    )
    const result = update(
      model,
      Message.GotRoomMessage({
        roomId: ROOM_A,
        message: RoomMessage.PressedKey({ key: 'Backspace' }),
      }),
    )

    expect(commandRecords(result.commands)).toEqual([
      {
        name: keyedRoomCommandName(ROOM_A, ClearSession.name),
        args: { roomId: ROOM_A },
      },
      {
        name: keyedRoomCommandName(ROOM_A, NavigateHome.name),
        args: undefined,
      },
    ])
  })

  test('uses the captured Room key when starting a mismatched payload Room', () => {
    const payloadRoom = makeRoom('payload-room', 41, playerA.id)
    const roomModel = modifyFields(dirtyRoomModel(ROOM_A), {
      roomAsyncData: () => RoomAsyncData.Success({ data: payloadRoom }),
    })
    const model = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_A }),
      ROOM_A,
      roomModel,
    )
    const result = update(
      model,
      Message.GotRoomMessage({
        roomId: ROOM_A,
        message: RoomMessage.PressedKey({ key: 'Enter' }),
      }),
    )

    expect(commandRecords(result.commands)).toEqual([
      {
        name: keyedRoomCommandName(ROOM_A, StartGame.name),
        args: { roomId: ROOM_A, playerId: playerA.id },
      },
    ])
  })
})

describe('Home Room preparation', () => {
  test.each([
    [
      'create',
      HomeMessage.SucceededCreateRoom({ roomId: ROOM_A, player: playerA }),
    ],
    [
      'join',
      HomeMessage.SucceededJoinRoomFromHome({
        roomId: ROOM_A,
        player: playerA,
      }),
    ],
  ])('prepares a clean joined Room after Home %s', (_name, message) => {
    const priorRoomModel = dirtyRoomModel(ROOM_A)
    const model = modelWithRoom(ApplicationRoute.Home(), ROOM_A, priorRoomModel)
    const prepared = update(model, Message.GotHomeMessage({ message }))
    const preparedRoom = getRoomInstance(prepared.model)

    expect(prepared.model.route).toEqual(ApplicationRoute.Home())
    expect(preparedRoom.roomId).toBe(ROOM_A)
    expect(preparedRoom.model).not.toBe(priorRoomModel)
    expect(preparedRoom.model.roomAsyncData).toEqual(RoomAsyncData.Idle())
    expect(preparedRoom.model.maybeSession).toEqual(
      Option.some({ roomId: ROOM_A, player: playerA }),
    )
    expect(preparedRoom.model.userGameText).toBe('')
    expect(preparedRoom.model.charsTyped).toBe(0)
    expect(preparedRoom.model.username).toBe('')
    expect(preparedRoom.model.isRoomIdCopyIndicatorVisible).toBe(false)
    expect(preparedRoom.model.exitCountdownSecondsLeft).toBe(0)
    expect(commandRecords(prepared.commands)).toEqual([
      {
        name: keyedRoomCommandName(ROOM_A, SavePlayerSession.name),
        args: { session: { roomId: ROOM_A, player: playerA } },
      },
      { name: NavigateToRoom.name, args: { roomId: ROOM_A } },
    ])

    const navigated = update(
      prepared.model,
      Message.ChangedUrl({ url: roomUrl(ROOM_A) }),
    )

    expect(getRoomInstance(navigated.model).model).toBe(preparedRoom.model)
    expect(navigated.commands).toBeUndefined()
  })
})
