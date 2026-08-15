import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import * as Shared from '@typing-game/shared'

import { GotHomeMessage, GotRoomMessage } from './message'
import { Model } from './model'
import { Home, Room } from './page'
import * as HomeMessage from './page/home/message'
import { StartGame } from './page/room/command'
import * as RoomMessage from './page/room/message'
import { HomeRoute, RoomRoute } from './route'
import { update } from './update'

const alice = { id: 'p1', username: 'alice' }

const waitingRoom: Shared.Room = {
  id: 'r1',
  players: [alice],
  hostId: alice.id,
  status: Shared.Waiting.make({}),
  maybeGame: Option.none(),
  maybeScoreboard: Option.none(),
  createdAt: 0,
  usedGameTexts: [],
}

const selectActionHome: Home.Model.Model = {
  homeStep: Home.Model.SelectAction({
    username: 'alice',
    selectedAction: 'CreateRoom',
  }),
  formError: Option.none(),
}

const joinedRoom: Room.Model.Model = {
  roomAsyncData: Room.Model.RoomAsyncData.Success({ data: waitingRoom }),
  maybeSession: Option.some({ roomId: 'r1', player: alice }),
  userGameText: '',
  charsTyped: 0,
  username: 'alice',
  isRoomIdCopyIndicatorVisible: false,
  exitCountdownSecondsLeft: 0,
}

const givenHomeRoute = () =>
  given<Model>({
    route: HomeRoute(),
    home: selectActionHome,
    room: joinedRoom,
  })

const givenRoomRoute = () =>
  given<Model>({
    route: RoomRoute({ roomId: 'r1' }),
    home: selectActionHome,
    room: joinedRoom,
  })

describe('key presses on the Home route', () => {
  test('a Home key press moves the home selection and leaves the room alone', () => {
    story(
      update,
      givenHomeRoute(),
      message(
        GotHomeMessage({
          message: HomeMessage.PressedKey({ key: 'ArrowDown' }),
        }),
      ),
      model(model => {
        expect(model.home.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
        expect(model.room).toEqual(joinedRoom)
      }),
      Command.expectNone(),
    )
  })

  test('a Room key press does nothing', () => {
    story(
      update,
      givenHomeRoute(),
      message(
        GotRoomMessage({ message: RoomMessage.PressedKey({ key: 'Enter' }) }),
      ),
      model(model => {
        expect(model.room).toEqual(joinedRoom)
      }),
      Command.expectNone(),
    )
  })
})

describe('key presses on the Room route', () => {
  test('a Room key press starts the game and leaves home alone', () => {
    story(
      update,
      givenRoomRoute(),
      message(
        GotRoomMessage({ message: RoomMessage.PressedKey({ key: 'Enter' }) }),
      ),
      Command.resolve(StartGame, RoomMessage.SucceededStartGame()),
      model(model => {
        expect(model.home).toEqual(selectActionHome)
      }),
    )
  })
})
