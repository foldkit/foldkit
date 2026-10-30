import { Effect, Layer, Option, pipe } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block, Url } from 'foldkit'
import type { BlockMessage, Resolved } from 'foldkit/block'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'
import * as Shared from '@typing-game/shared'

import {
  ApplicationLive,
  Message,
  type Model,
  NavigateToRoom,
} from './application'
import { Home, HomeLive, HomeStep } from './page/home'
import { CopyableRoomId, CopyableRoomIdLive } from './page/room/copyableRoomId'
import {
  FocusRoomPageUsernameInput,
  JoinForm,
  JoinFormLive,
} from './page/room/joinForm'
import {
  ClearSession,
  FetchRoom,
  LoadSession,
  NavigateHome,
  Room,
  RoomAsyncData,
  RoomLive,
  SavePlayerSession,
  StartGame,
} from './page/room/room'
import { FocusUserGameTextInput, Typing, TypingLive } from './page/room/typing'
import { ApplicationRoute } from './route'
import { RoomsClient } from './services'

type ApplicationModel = Resolved<Model>
type HomeModel = typeof Home.Model.Type
type RoomModel = Resolved<typeof Room.Model.Type>
type RoomMessage = typeof Room.Message.Type

const ApplicationTestLayer = ApplicationLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      HomeLive,
      RoomLive.pipe(
        Layer.provide(
          Layer.mergeAll(JoinFormLive, CopyableRoomIdLive, TypingLive),
        ),
      ),
    ),
  ),
)

const ServicesTestLayer = Layer.mergeAll(
  Layer.mock(RoomsClient, {}),
  KeyValueStore.layerMemory,
)

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

const initialRoom: RoomModel = {
  roomAsyncData: RoomAsyncData.Idle(),
  maybeSession: Option.none(),
  typing: { userGameText: '', charsTyped: 0 },
  joinForm: { username: '' },
  copyableRoomId: { isCopiedIndicatorVisible: false },
  exitCountdownSecondsLeft: 0,
}

const joinedRoom: RoomModel = modifyFields(initialRoom, {
  roomAsyncData: () => RoomAsyncData.Success({ data: waitingRoom }),
  maybeSession: () => Option.some({ roomId: ROOM_A, player: alice }),
  joinForm: () => ({ username: 'alice' }),
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

const dirtyRoomModel = (roomId: string): RoomModel =>
  modifyFields(initialRoom, {
    roomAsyncData: () => RoomAsyncData.Success({ data: makeRoom(roomId, 37) }),
    maybeSession: () => Option.some({ roomId, player: alice }),
    typing: () => ({ userGameText: 'typed text', charsTyped: 10 }),
    joinForm: () => ({ username: 'prior username' }),
    copyableRoomId: () => ({ isCopiedIndicatorVisible: true }),
    exitCountdownSecondsLeft: () => 4,
  })

const modelWithRoom = (
  route: ApplicationRoute,
  roomModel: RoomModel,
): ApplicationModel => ({
  route,
  home: selectActionHome,
  maybeRoom: Option.some(roomModel),
})

const getRoom = (model: ApplicationModel): RoomModel =>
  Option.getOrThrow(model.maybeRoom)

const deliverHomeMessage = (homeMessage: typeof Home.Message.Type) =>
  message(Block.deliver(Home, 'home', homeMessage))

const toRoom = (roomId: string, roomMessage: RoomMessage): BlockMessage =>
  Block.deliver(Room, ['room', roomId], roomMessage)

const toJoinForm = (
  roomId: string,
  joinFormMessage: typeof JoinForm.Message.Type,
): BlockMessage =>
  Block.deliver(JoinForm, ['room', roomId, 'joinForm'], joinFormMessage)

const toCopyableRoomId = (
  roomId: string,
  copyableRoomIdMessage: typeof CopyableRoomId.Message.Type,
): BlockMessage =>
  Block.deliver(
    CopyableRoomId,
    ['room', roomId, 'copyableRoomId'],
    copyableRoomIdMessage,
  )

const deliverRoomMessage = (roomId: string, roomMessage: RoomMessage) =>
  message(toRoom(roomId, roomMessage))

describe('key presses on the Home route', () => {
  it.effect(
    'a Home key press moves the home selection and leaves the room alone',
    () =>
      story(
        ApplicationTestLayer,
        { url: homeUrl },
        given({
          route: ApplicationRoute.Home(),
          home: selectActionHome,
          maybeRoom: Option.none(),
        }),
        deliverHomeMessage(Home.Message.PressedKey({ key: 'ArrowDown' })),
        model(model => {
          expect(model.home.homeStep).toMatchObject({
            _tag: 'SelectAction',
            selectedAction: 'JoinRoom',
          })
          expect(model.maybeRoom).toEqual(Option.none())
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(ServicesTestLayer)),
  )

  it.effect('a captured key press reaches Home', () =>
    story(
      ApplicationTestLayer,
      { url: homeUrl },
      given({
        route: ApplicationRoute.Home(),
        home: selectActionHome,
        maybeRoom: Option.none(),
      }),
      message(Message.PressedKey({ key: 'ArrowDown' })),
      model(model => {
        expect(model.home.homeStep).toMatchObject({
          _tag: 'SelectAction',
          selectedAction: 'JoinRoom',
        })
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(ServicesTestLayer)),
  )

  it.effect('a Room key press does nothing', () =>
    story(
      ApplicationTestLayer,
      { url: homeUrl },
      given({
        route: ApplicationRoute.Home(),
        home: selectActionHome,
        maybeRoom: Option.none(),
      }),
      deliverRoomMessage(ROOM_A, Room.Message.PressedKey({ key: 'Enter' })),
      model(model => {
        expect(model.maybeRoom).toEqual(Option.none())
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(ServicesTestLayer)),
  )
})

describe('key presses on the Room route', () => {
  it.effect('a Room key press starts the game and leaves home alone', () =>
    story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_A) },
      given(
        modelWithRoom(ApplicationRoute.Room({ roomId: ROOM_A }), joinedRoom),
      ),
      deliverRoomMessage(ROOM_A, Room.Message.PressedKey({ key: 'Enter' })),
      Command.resolve(StartGame, Room.Message.SucceededStartGame()),
      model(model => {
        expect(model.home).toEqual(selectActionHome)
      }),
    ).pipe(Effect.provide(ServicesTestLayer)),
  )

  it.effect('a captured key press reaches the Room and not Home', () =>
    story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_A) },
      given(
        modelWithRoom(ApplicationRoute.Room({ roomId: ROOM_A }), joinedRoom),
      ),
      message(Message.PressedKey({ key: 'Enter' })),
      Command.resolveAllExact([
        StartGame({ roomId: ROOM_A, playerId: alice.id }),
        Room.Message.SucceededStartGame(),
      ]),
      model(model => {
        expect(model.home).toEqual(selectActionHome)
      }),
    ).pipe(Effect.provide(ServicesTestLayer)),
  )
})

describe('Room navigation', () => {
  it.effect(
    'changing Room routes replaces the child and starts the new Room load',
    () =>
      story(
        ApplicationTestLayer,
        { url: roomUrl(ROOM_A) },
        given(
          modelWithRoom(
            ApplicationRoute.Room({ roomId: ROOM_A }),
            dirtyRoomModel(ROOM_A),
          ),
        ),
        message(Message.ChangedUrl({ url: roomUrl(ROOM_B) })),
        model(model => {
          expect(model.route).toEqual(ApplicationRoute.Room({ roomId: ROOM_B }))
          expect(getRoom(model)).toEqual(initialRoom)
        }),
        Command.resolveAllExact(
          [
            LoadSession({ roomId: ROOM_B }),
            Room.Message.CompletedLoadSession({ maybeSession: Option.none() }),
          ],
          [
            FetchRoom({ roomId: ROOM_B }),
            Room.Message.SucceededFetchRoom({ room: makeRoom(ROOM_B, 100) }),
          ],
          [
            FocusRoomPageUsernameInput,
            JoinForm.Message.CompletedFocusRoomPageUsernameInput(),
          ],
        ),
      ).pipe(Effect.provide(ServicesTestLayer)),
  )

  it.effect('leaving a Room removes its child Model', () =>
    story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_A) },
      given(
        modelWithRoom(
          ApplicationRoute.Room({ roomId: ROOM_A }),
          dirtyRoomModel(ROOM_A),
        ),
      ),
      message(Message.ChangedUrl({ url: homeUrl })),
      model(model => {
        expect(model.route).toEqual(ApplicationRoute.Home())
        expect(model.maybeRoom).toEqual(Option.none())
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(ServicesTestLayer)),
  )

  it.effect('preserves the child Model on a same-Room URL', () => {
    const roomModel = dirtyRoomModel(ROOM_A)

    return story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_A) },
      given(
        modelWithRoom(ApplicationRoute.Room({ roomId: ROOM_A }), roomModel),
      ),
      message(Message.ChangedUrl({ url: roomUrl(ROOM_A) })),
      model(model => {
        expect(getRoom(model)).toStrictEqual(roomModel)
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(ServicesTestLayer))
  })
})

describe('Room game phases', () => {
  it.effect('starting a game clears typed text and focuses the input', () => {
    const typingRoom = modifyFields(dirtyRoomModel(ROOM_A), {
      roomAsyncData: () =>
        RoomAsyncData.Success({
          data: {
            ...waitingRoom,
            status: Shared.Countdown.make({ secondsLeft: 1 }),
          },
        }),
    })

    return story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_A) },
      given(
        modelWithRoom(ApplicationRoute.Room({ roomId: ROOM_A }), typingRoom),
      ),
      deliverRoomMessage(
        ROOM_A,
        Room.Message.UpdatedRoom({
          room: {
            ...waitingRoom,
            status: Shared.Playing.make({ secondsLeft: 30 }),
          },
          maybePlayerProgress: Option.none(),
        }),
      ),
      model(model => {
        expect(getRoom(model).typing).toEqual({
          userGameText: '',
          charsTyped: 0,
        })
      }),
      Command.resolve(
        FocusUserGameTextInput,
        Typing.Message.CompletedFocusUserGameTextInput(),
      ),
    ).pipe(Effect.provide(ServicesTestLayer))
  })
})

describe('Room occurrence identity', () => {
  it.effect('ignores stale child results after the active Room changes', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      dirtyRoomModel(ROOM_B),
    )
    const staleMessages: ReadonlyArray<BlockMessage> = [
      toJoinForm(ROOM_A, JoinForm.Message.SucceededJoinRoom({ player: alice })),
      toRoom(
        ROOM_A,
        Room.Message.CompletedLoadSession({
          maybeSession: Option.some({ roomId: ROOM_A, player: alice }),
        }),
      ),
      toRoom(
        ROOM_A,
        Room.Message.SucceededFetchRoom({ room: makeRoom(ROOM_A, 90) }),
      ),
      toRoom(
        ROOM_A,
        Room.Message.UpdatedRoom({
          room: makeRoom(ROOM_A, 91),
          maybePlayerProgress: Option.none(),
        }),
      ),
      toCopyableRoomId(ROOM_A, CopyableRoomId.Message.SucceededCopyRoomId()),
      toRoom(ROOM_A, Room.Message.CompletedWaitForExitCountdownInterval()),
    ]

    return Effect.forEach(staleMessages, staleMessage =>
      story(
        ApplicationTestLayer,
        { url: roomUrl(ROOM_B) },
        given(initialModel),
        message(staleMessage),
        model(model => {
          expect(model).toEqual(initialModel)
        }),
        Command.expectNone(),
      ),
    ).pipe(Effect.provide(ServicesTestLayer))
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

      return story(
        ApplicationTestLayer,
        { url: roomUrl(ROOM_A) },
        given(
          modelWithRoom(
            ApplicationRoute.Room({ roomId: ROOM_A }),
            mismatchedRoomModel,
          ),
        ),
        deliverRoomMessage(
          ROOM_A,
          Room.Message.PressedKey({ key: 'Backspace' }),
        ),
        Command.resolveAllExact(
          [
            ClearSession({ roomId: ROOM_A }),
            Room.Message.CompletedClearSession(),
          ],
          [NavigateHome(), Room.Message.CompletedNavigateHome()],
        ),
      ).pipe(Effect.provide(ServicesTestLayer))
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

      return story(
        ApplicationTestLayer,
        { url: roomUrl(ROOM_A) },
        given(
          modelWithRoom(
            ApplicationRoute.Room({ roomId: ROOM_A }),
            mismatchedRoomModel,
          ),
        ),
        deliverRoomMessage(ROOM_A, Room.Message.PressedKey({ key: 'Enter' })),
        Command.resolveAllExact([
          StartGame({ roomId: ROOM_A, playerId: alice.id }),
          Room.Message.SucceededStartGame(),
        ]),
      ).pipe(Effect.provide(ServicesTestLayer))
    },
  )
})

describe('Home and Room coordination', () => {
  it.effect.each<Readonly<{ name: string; joinMessage: BlockMessage }>>([
    {
      name: 'InformedOfJoin',
      joinMessage: toRoom(ROOM_A, Room.Message.InformedOfJoin({ player: bob })),
    },
    {
      name: 'SucceededJoinRoom',
      joinMessage: toJoinForm(
        ROOM_A,
        JoinForm.Message.SucceededJoinRoom({ player: bob }),
      ),
    },
  ])('$name records and saves the joined player', ({ joinMessage }) => {
    const expectedSession = { roomId: ROOM_A, player: bob }

    return story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_A) },
      given(
        modelWithRoom(ApplicationRoute.Room({ roomId: ROOM_A }), joinedRoom),
      ),
      message(joinMessage),
      model(model => {
        expect(getRoom(model).maybeSession).toEqual(
          Option.some(expectedSession),
        )
      }),
      Command.resolveAllExact([
        SavePlayerSession({ session: expectedSession }),
        Room.Message.CompletedSavePlayerSession(),
      ]),
    ).pipe(Effect.provide(ServicesTestLayer))
  })

  it.effect.each<
    Readonly<{ outcome: string; homeMessage: typeof Home.Message.Type }>
  >([
    {
      outcome: 'created',
      homeMessage: Home.Message.SucceededCreateRoom({
        roomId: ROOM_A,
        player: alice,
      }),
    },
    {
      outcome: 'joined',
      homeMessage: Home.Message.SucceededJoinRoomFromHome({
        roomId: ROOM_A,
        player: alice,
      }),
    },
  ])('prepares a clean Room after Home has $outcome it', ({ homeMessage }) => {
    const expectCleanJoinedRoom = model((model: ApplicationModel) => {
      const room = getRoom(model)

      expect(model.route).toEqual(ApplicationRoute.Home())
      expect(room).toEqual(
        modifyFields(initialRoom, {
          maybeSession: () => Option.some({ roomId: ROOM_A, player: alice }),
        }),
      )
    })
    const resolveJoinCommands = Command.resolveAllExact(
      [
        SavePlayerSession({ session: { roomId: ROOM_A, player: alice } }),
        Room.Message.CompletedSavePlayerSession(),
      ],
      [NavigateToRoom({ roomId: ROOM_A }), Message.CompletedNavigateToRoom()],
    )

    return story(
      ApplicationTestLayer,
      { url: homeUrl },
      given({
        route: ApplicationRoute.Home(),
        home: selectActionHome,
        maybeRoom: Option.none(),
      }),
      deliverHomeMessage(homeMessage),
      expectCleanJoinedRoom,
      resolveJoinCommands,
      message(
        toJoinForm(
          ROOM_A,
          JoinForm.Message.ChangedUsername({ value: 'prior username' }),
        ),
      ),
      deliverHomeMessage(homeMessage),
      expectCleanJoinedRoom,
      resolveJoinCommands,
    ).pipe(Effect.provide(ServicesTestLayer))
  })

  it.effect('ignores a delayed Home result after entering another Room', () => {
    const initialModel = modelWithRoom(
      ApplicationRoute.Room({ roomId: ROOM_B }),
      dirtyRoomModel(ROOM_B),
    )

    return story(
      ApplicationTestLayer,
      { url: roomUrl(ROOM_B) },
      given(initialModel),
      deliverHomeMessage(
        Home.Message.SucceededCreateRoom({ roomId: ROOM_A, player: bob }),
      ),
      model(model => {
        expect(model).toEqual(initialModel)
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(ServicesTestLayer))
  })
})
