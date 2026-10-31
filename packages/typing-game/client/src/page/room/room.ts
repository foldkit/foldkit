import { clsx } from 'clsx'
import {
  Array,
  Cause,
  Effect,
  Match,
  Number,
  Option,
  Order,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { AsyncData, Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { homeRouter } from '../../route'
import { RoomsClient } from '../../services'
import { CopyableRoomId } from './copyableRoomId'
import { JoinForm } from './joinForm'
import { Typing } from './typing'

export const ROOM_PLAYER_SESSION_KEY = 'roomPlayerSession'
const EXIT_COUNTDOWN_SECONDS = 3
const EXIT_COUNTDOWN_INTERVAL = '1 second'

// MODEL

export const RoomPlayerSession = Schema.Struct({
  roomId: Schema.String,
  player: Shared.Player,
})
export type RoomPlayerSession = typeof RoomPlayerSession.Type

export const RoomPlayerSessionJsonString = Schema.fromJsonString(
  Schema.toCodecJson(RoomPlayerSession),
)

export const RoomAsyncData = AsyncData.Schema(Shared.Room, Schema.String)

const Model = Schema.Struct({
  roomAsyncData: RoomAsyncData.schema,
  maybeSession: Schema.Option(RoomPlayerSession),
  typing: Typing,
  joinForm: JoinForm,
  copyableRoomId: CopyableRoomId,
  exitCountdownSecondsLeft: Schema.Number,
})
type Model = typeof Model.Type

const isLeavableStatus = (status: Shared.GameStatus): boolean =>
  Match.value(status).pipe(
    Match.tag('Waiting', 'Finished', () => true),
    Match.orElse(() => false),
  )

const isRoomLeavable = (model: Model): boolean =>
  Option.exists(AsyncData.getData(model.roomAsyncData), ({ status }) =>
    isLeavableStatus(status),
  )

export const roomCapturesKeyboard = (model: Model): boolean =>
  Option.isSome(model.maybeSession) && isRoomLeavable(model)

// MESSAGE

const Message = defineMessageUnion({
  CompletedNavigateHome: {},
  SucceededStartGame: {},
  FailedStartGame: {},
  CompletedSavePlayerSession: {},
  CompletedClearSession: {},
  PressedKey: { key: Schema.String },
  UpdatedRoom: {
    room: Shared.Room,
    maybePlayerProgress: Schema.Option(Shared.PlayerProgress),
  },
  FailedStreamRoom: { error: Schema.String },
  CompletedLoadSession: { maybeSession: Schema.Option(RoomPlayerSession) },
  SucceededFetchRoom: { room: Shared.Room },
  FailedFetchRoom: {},
  CompletedWaitForExitCountdownInterval: {},
  InformedOfJoin: { player: Shared.Player },
})
type Message = typeof Message.Type

// COMMAND

export const FetchRoom = Command.define('FetchRoom', {
  args: { roomId: Schema.String },
  messages: [Message.SucceededFetchRoom, Message.FailedFetchRoom],
})

export const LoadSession = Command.define('LoadSession', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedLoadSession],
})

export const StartGame = Command.define('StartGame', {
  args: { roomId: Schema.String, playerId: Schema.String },
  messages: [Message.SucceededStartGame, Message.FailedStartGame],
})

export const WaitForExitCountdownInterval = Command.define(
  'WaitForExitCountdownInterval',
  { messages: [Message.CompletedWaitForExitCountdownInterval] },
)

export const SavePlayerSession = Command.define('SavePlayerSession', {
  args: { session: RoomPlayerSession },
  messages: [Message.CompletedSavePlayerSession],
})

export const ClearSession = Command.define('ClearSession', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedClearSession],
})

export const NavigateHome = Command.define('NavigateHome', {
  messages: [Message.CompletedNavigateHome],
})

/** `isRestoring` loads the stored session and the Room when the instance
 *  appears. A Room joined from Home skips both and receives `InformedOfJoin`. */
export type RoomArgs = Readonly<{ isRestoring: boolean }>

export class Room extends Block<Room, RoomArgs>()('Room', {
  Model,
  Message,
  Command: [
    FetchRoom,
    LoadSession,
    StartGame,
    WaitForExitCountdownInterval,
    SavePlayerSession,
    ClearSession,
    NavigateHome,
  ],
}) {}

// LIVE

export const RoomLive = Room.make(
  Effect.fn(function* (roomId, { isRestoring }) {
    const client = yield* RoomsClient
    const store = yield* KeyValueStore.KeyValueStore
    const joinForm = yield* new JoinForm('joinForm', { roomId })
    const copyableRoomId = yield* new CopyableRoomId('copyableRoomId', {
      roomId,
    })
    const typing = yield* new Typing('typing')

    return {
      model: {
        roomAsyncData: RoomAsyncData.Idle(),
        maybeSession: Option.none(),
        typing,
        joinForm,
        copyableRoomId,
        exitCountdownSecondsLeft: 0,
      },

      start: Array.filter(
        [LoadSession({ roomId }), FetchRoom({ roomId })],
        () => isRestoring,
      ),

      update: {
        PressedKey: (model, { key }) => pressedKeyStep(model, roomId, key),
        UpdatedRoom: updatedRoomStep,
        FailedStreamRoom: model => ({ model }),
        CompletedLoadSession: (model, { maybeSession }) =>
          completedLoadSessionStep(model, maybeSession),
        SucceededFetchRoom: (model, { room }) =>
          succeededFetchRoomStep(model, room),
        FailedFetchRoom: model => ({
          model: modifyFields(model, {
            roomAsyncData: () =>
              RoomAsyncData.Failure({ error: 'Room not found' }),
          }),
        }),
        CompletedWaitForExitCountdownInterval:
          completedWaitForExitCountdownIntervalStep,
        InformedOfJoin: (model, { player }) =>
          recordJoinedPlayerStep(model, roomId, player),
        CompletedNavigateHome: model => ({ model }),
        SucceededStartGame: model => ({ model }),
        FailedStartGame: model => ({ model }),
        CompletedSavePlayerSession: model => ({ model }),
        CompletedClearSession: model => ({ model }),
        ...joinForm.on({
          JoinedRoom: (model, { player }) =>
            recordJoinedPlayerStep(model, roomId, player),
        }),
      },

      commands: {
        ...makeSessionCommands(store),
        FetchRoom: ({ roomId }) =>
          client.getRoomById({ roomId }).pipe(
            Effect.map(room => Message.SucceededFetchRoom({ room })),
            Effect.catch(() => Effect.succeed(Message.FailedFetchRoom())),
          ),
        StartGame: ({ roomId, playerId }) =>
          client.startGame({ roomId, playerId }).pipe(
            Effect.as(Message.SucceededStartGame()),
            Effect.catch(() => Effect.succeed(Message.FailedStartGame())),
          ),
        WaitForExitCountdownInterval: () =>
          Effect.sleep(EXIT_COUNTDOWN_INTERVAL).pipe(
            Effect.as(Message.CompletedWaitForExitCountdownInterval()),
          ),
        NavigateHome: () =>
          pushUrl(homeRouter()).pipe(
            Effect.as(Message.CompletedNavigateHome()),
          ),
      },

      subscriptions: {
        roomUpdates: {
          dependencies: model =>
            Option.map(model.maybeSession, ({ roomId, player }) => ({
              roomId,
              playerId: player.id,
            })),
          stream: (
            maybeSubscription: Option.Option<
              Readonly<{ roomId: string; playerId: string }>
            >,
          ) =>
            Option.match(maybeSubscription, {
              onNone: () => Stream.empty,
              onSome: ({ roomId, playerId }) =>
                client.subscribeToRoom({ roomId, playerId }).pipe(
                  Stream.map(({ room, maybePlayerProgress }) =>
                    Message.UpdatedRoom({ room, maybePlayerProgress }),
                  ),
                  Stream.catchCause(cause =>
                    Stream.make(
                      Message.FailedStreamRoom({
                        error: Option.match(Cause.findErrorOption(cause), {
                          onNone: () => 'Unknown stream error',
                          onSome: globalThis.String,
                        }),
                      }),
                    ),
                  ),
                ),
            }),
        },
      },

      view: (model, h) => view(model, roomId, h),
    }
  }),
)

// SESSION

const roomPlayerSessionKey = (roomId: string): string =>
  `${ROOM_PLAYER_SESSION_KEY}:${roomId}`

export const makeSessionCommands = (store: KeyValueStore.KeyValueStore) => ({
  LoadSession: ({ roomId }: Readonly<{ roomId: string }>) =>
    Effect.gen(function* () {
      const scopedSessionJson = yield* store.get(roomPlayerSessionKey(roomId))
      const sessionJson =
        scopedSessionJson ?? (yield* store.get(ROOM_PLAYER_SESSION_KEY))
      const storedSessionJson = yield* Effect.fromOption(
        Option.fromNullishOr(sessionJson),
      )
      const session = yield* Schema.decodeEffect(RoomPlayerSessionJsonString)(
        storedSessionJson,
      )

      return Message.CompletedLoadSession({
        maybeSession: Option.liftPredicate(
          session,
          ({ roomId: sessionRoomId }) => sessionRoomId === roomId,
        ),
      })
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(
          Message.CompletedLoadSession({ maybeSession: Option.none() }),
        ),
      ),
    ),

  SavePlayerSession: ({ session }: Readonly<{ session: RoomPlayerSession }>) =>
    Effect.gen(function* () {
      const sessionJson = yield* Schema.encodeEffect(
        RoomPlayerSessionJsonString,
      )(session)

      yield* store.set(roomPlayerSessionKey(session.roomId), sessionJson)

      return Message.CompletedSavePlayerSession()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSavePlayerSession())),
    ),

  ClearSession: ({ roomId }: Readonly<{ roomId: string }>) =>
    Effect.gen(function* () {
      yield* store.remove(roomPlayerSessionKey(roomId))

      const maybeLegacySessionJson = Option.fromNullishOr(
        yield* store.get(ROOM_PLAYER_SESSION_KEY),
      )

      if (Option.isSome(maybeLegacySessionJson)) {
        const session = yield* Schema.decodeEffect(RoomPlayerSessionJsonString)(
          maybeLegacySessionJson.value,
        )

        if (session.roomId === roomId) {
          yield* store.remove(ROOM_PLAYER_SESSION_KEY)
        }
      }

      return Message.CompletedClearSession()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedClearSession())),
    ),
})

// UPDATE

type TypingMessage = typeof Typing.Message.Type

const typingMessageForRoomUpdate = (
  room: Shared.Room,
  maybePlayerProgress: Option.Option<Shared.PlayerProgress>,
  isGameJustStarted: boolean,
): TypingMessage => {
  if (isGameJustStarted) {
    return Typing.Message.InformedOfGameStart()
  } else if (room.status._tag === 'Finished') {
    return Typing.Message.InformedOfGameEnd()
  } else {
    return Typing.Message.ReceivedPlayerProgress({ maybePlayerProgress })
  }
}

const updatedRoomStep = (
  model: Model,
  {
    room,
    maybePlayerProgress,
  }: Readonly<{
    room: Shared.Room
    maybePlayerProgress: Option.Option<Shared.PlayerProgress>
  }>,
) => {
  const maybePreviousStatus = Option.map(
    AsyncData.getData(model.roomAsyncData),
    ({ status }) => status,
  )
  const hasStatusEntered = (tag: Shared.GameStatus['_tag']): boolean =>
    room.status._tag === tag &&
    Option.exists(maybePreviousStatus, ({ _tag }) => _tag !== tag)

  const isGameJustStarted = hasStatusEntered('Playing')
  const isGameJustFinished = hasStatusEntered('Finished')

  const typingMessage = typingMessageForRoomUpdate(
    room,
    maybePlayerProgress,
    isGameJustStarted,
  )

  return {
    model: modifyFields(model, {
      roomAsyncData: () => RoomAsyncData.Success({ data: room }),
      exitCountdownSecondsLeft: secondsLeft =>
        isGameJustFinished ? EXIT_COUNTDOWN_SECONDS : secondsLeft,
    }),
    commands: Array.filter(
      [WaitForExitCountdownInterval()],
      () => isGameJustFinished,
    ),
    messages: [model.typing.send(typingMessage)],
  }
}

const focusJoinForm = (model: Model) =>
  model.joinForm.send(JoinForm.Message.RequestedFocus())

const completedLoadSessionStep = (
  model: Model,
  maybeSession: Option.Option<RoomPlayerSession>,
) => ({
  model: modifyFields(model, { maybeSession: () => maybeSession }),
  messages: Array.filter(
    [focusJoinForm(model)],
    () =>
      Option.isNone(maybeSession) && AsyncData.isSuccess(model.roomAsyncData),
  ),
})

const succeededFetchRoomStep = (model: Model, room: Shared.Room) => ({
  model: modifyFields(model, {
    roomAsyncData: () => RoomAsyncData.Success({ data: room }),
  }),
  messages: Array.filter([focusJoinForm(model)], () =>
    Option.isNone(model.maybeSession),
  ),
})

const completedWaitForExitCountdownIntervalStep = (model: Model) => {
  const nextExitCountdownSecondsLeft = Number.decrement(
    model.exitCountdownSecondsLeft,
  )

  return {
    model: modifyFields(model, {
      exitCountdownSecondsLeft: () => nextExitCountdownSecondsLeft,
    }),
    commands: Array.filter(
      [WaitForExitCountdownInterval()],
      () => nextExitCountdownSecondsLeft > 0,
    ),
  }
}

const recordJoinedPlayerStep = (
  model: Model,
  roomId: string,
  player: Shared.Player,
) => {
  const session = RoomPlayerSession.make({ roomId, player })

  return {
    model: modifyFields(model, { maybeSession: () => Option.some(session) }),
    commands: [SavePlayerSession({ session })],
  }
}

const leaveRoomStep = (model: Model, roomId: string) => ({
  model: modifyFields(model, {
    maybeSession: () => Option.none(),
    roomAsyncData: () => RoomAsyncData.Loading(),
  }),
  commands: [ClearSession({ roomId }), NavigateHome()],
})

const startGameStep = (model: Model, roomId: string, room: Shared.Room) => ({
  model,
  commands: pipe(
    model.maybeSession,
    Option.filter(({ player }) => player.id === room.hostId),
    Option.map(({ player }) => StartGame({ roomId, playerId: player.id })),
    Array.fromOption,
  ),
})

const pressedKeyStep = (model: Model, roomId: string, key: string) =>
  pipe(
    AsyncData.getData(model.roomAsyncData),
    Option.filter(({ status }) => isLeavableStatus(status)),
    Option.match({
      onNone: () => ({ model }),
      onSome: room => {
        const isLeaveAllowed =
          room.status._tag === 'Waiting' || model.exitCountdownSecondsLeft === 0

        return Match.value(key).pipe(
          Match.when('Backspace', () =>
            isLeaveAllowed ? leaveRoomStep(model, roomId) : { model },
          ),
          Match.when('Enter', () => startGameStep(model, roomId, room)),
          Match.orElse(() => ({ model })),
        )
      },
    }),
  )

// VIEW

type RoomViewBuilder = HtmlBuilder<Message>

const gameTextView = (
  maybeGameText: Option.Option<string>,
  h: RoomViewBuilder,
): Html =>
  Option.match(maybeGameText, {
    onNone: () => h.empty,
    onSome: text => h.div([], [text]),
  })

const waitingView = (
  { players, hostId }: Shared.Room,
  sessionPlayerId: string,
  h: RoomViewBuilder,
): Html => {
  const playerView = (player: Shared.Player): Html => {
    const badges = [
      ...Array.filter(['host'], () => player.id === hostId),
      ...Array.filter(['you'], () => player.id === sessionPlayerId),
    ]

    return h.keyed('div')(
      player.id,
      [],
      [
        h.span([], [player.username]),
        ...Array.map(badges, badge =>
          h.span([h.Class('uppercase')], [` [${badge}]`]),
        ),
      ],
    )
  }

  return h.div(
    [],
    [
      h.h3([h.Class('uppercase mb-2')], ['[Connected users]']),
      h.div([h.Class('space-y-2 mb-12')], Array.map(players, playerView)),
      ...Array.filter(
        [h.div([], ['> Enter to start game'])],
        () => sessionPlayerId === hostId,
      ),
    ],
  )
}

const getReadyView = (
  maybeGameText: Option.Option<string>,
  h: RoomViewBuilder,
): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], ['Preparing game...']),
      gameTextView(maybeGameText, h),
    ],
  )

const countdownView = (
  secondsLeft: number,
  maybeGameText: Option.Option<string>,
  h: RoomViewBuilder,
): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], [`Starting in ${secondsLeft}...`]),
      gameTextView(maybeGameText, h),
    ],
  )

const byHighestWpm = pipe(
  Number.Order,
  Order.mapInput(({ wpm }: Shared.PlayerScore) => wpm),
  Order.flip,
)

const scoreboardView = (
  scoreboard: Shared.Scoreboard,
  hostId: string,
  h: RoomViewBuilder,
): Html => {
  const sortedScoreboard = Array.sort(scoreboard, byHighestWpm)
  const lastIndex = Number.decrement(sortedScoreboard.length)

  const headerCell = (label: string, alignment: string): Html =>
    h.th(
      [h.Class(`p-4 border-b-2 border-terminal-green uppercase ${alignment}`)],
      [label],
    )

  const scoreRow = (score: Shared.PlayerScore, index: number): Html => {
    const cell = (className: string, content: ReadonlyArray<Html | string>) =>
      h.td(
        [
          h.Class(
            clsx(className, {
              'border-b-2 border-terminal-green': index < lastIndex,
            }),
          ),
        ],
        content,
      )

    return h.tr(
      [],
      [
        cell('p-4', [
          index === 0 ? '> ' : '  ',
          score.username,
          ...Array.filter(
            [h.span([h.Class('uppercase')], [' [host]'])],
            () => score.playerId === hostId,
          ),
        ]),
        cell('p-4 text-right', [score.wpm.toFixed(1)]),
        cell('p-4 text-right', [`${score.accuracy.toFixed(1)}%`]),
        cell('p-4 text-right', [globalThis.String(score.charsTyped)]),
      ],
    )
  }

  return h.table(
    [h.Class('border-2 border-terminal-green box-glow w-full border-collapse')],
    [
      h.thead(
        [],
        [
          h.tr(
            [],
            [
              headerCell('Player', 'text-left'),
              headerCell('WPM', 'text-right'),
              headerCell('Accuracy', 'text-right'),
              headerCell('Chars', 'text-right'),
            ],
          ),
        ],
      ),
      h.tbody([], Array.map(sortedScoreboard, scoreRow)),
    ],
  )
}

const finishedView = (
  { maybeScoreboard, hostId }: Shared.Room,
  sessionPlayerId: string,
  h: RoomViewBuilder,
): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.h3([h.Class('uppercase')], ['[Game complete]']),
      Option.match(maybeScoreboard, {
        onNone: () => h.empty,
        onSome: scoreboard => scoreboardView(scoreboard, hostId, h),
      }),
      ...Array.filter(
        [h.div([h.Class('mt-4')], ['> Enter to play again'])],
        () => sessionPlayerId === hostId,
      ),
    ],
  )

const playingView = (
  secondsLeft: number,
  maybeGame: Option.Option<Shared.Game>,
  playerId: string,
  typing: Typing,
  h: RoomViewBuilder,
): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.h3(
        [h.Class('uppercase')],
        [
          `[Time remaining] ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`,
        ],
      ),
      Option.match(maybeGame, {
        onNone: () => h.empty,
        onSome: game => typing.view({ game, playerId }),
      }),
    ],
  )

const gameView = (
  room: Shared.Room,
  { player }: RoomPlayerSession,
  typing: Typing,
  h: RoomViewBuilder,
): Html => {
  const maybeGameText = Option.map(room.maybeGame, ({ text }) => text)

  return Match.value(room.status).pipe(
    Match.tagsExhaustive({
      Waiting: () => waitingView(room, player.id, h),
      GetReady: () => getReadyView(maybeGameText, h),
      Countdown: ({ secondsLeft }) =>
        countdownView(secondsLeft, maybeGameText, h),
      Playing: ({ secondsLeft }) =>
        playingView(secondsLeft, room.maybeGame, player.id, typing, h),
      Finished: () => finishedView(room, player.id, h),
    }),
  )
}

const contentView = (
  { roomAsyncData, maybeSession, typing, joinForm }: Model,
  h: RoomViewBuilder,
): Html =>
  AsyncData.matchData(roomAsyncData, {
    onEmpty: () => h.div([], ['Loading...']),
    onFailure: () => h.empty,
    onData: room =>
      Option.match(maybeSession, {
        onNone: () => joinForm.view(),
        onSome: session => gameView(room, session, typing, h),
      }),
  })

const roomErrorView = (
  maybeError: Option.Option<string>,
  h: RoomViewBuilder,
): Html =>
  Option.match(maybeError, {
    onNone: () => h.empty,
    onSome: errorMessage =>
      h.div(
        [h.Class('mt-6')],
        [
          h.span([h.Class('text-terminal-red uppercase')], ['[Error] ']),
          h.span([h.Class('text-terminal-red')], [errorMessage]),
        ],
      ),
  })

const leaveRoomView = (model: Model, h: RoomViewBuilder): Html => {
  if (!isRoomLeavable(model)) {
    return h.empty
  } else if (model.exitCountdownSecondsLeft > 0) {
    return h.div(
      [h.Class('opacity-30')],
      [`< Backspace to leave room (${model.exitCountdownSecondsLeft})`],
    )
  } else {
    return h.div([], ['< Backspace to leave room'])
  }
}

const view = (model: Model, roomId: string, h: RoomViewBuilder): Html =>
  h.keyed('div')(
    roomId,
    [h.Class('max-w-4xl flex-1 flex flex-col justify-between')],
    [
      h.div(
        [],
        [
          Option.match(model.maybeSession, {
            onNone: () => h.empty,
            onSome: ({ player }) =>
              h.h2([h.Class('mb-6')], [`Welcome, ${player.username}!`]),
          }),
          h.h3([h.Class('uppercase')], ['[Room id]']),
          model.copyableRoomId.view(),
          contentView(model, h),
          roomErrorView(AsyncData.getError(model.roomAsyncData), h),
        ],
      ),
      h.div([], [leaveRoomView(model, h)]),
    ],
  )
