import { Array, Effect, Match, Number, Option, String, pipe } from 'effect'
import { AsyncData, Command, type Update } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { optionWhen } from '../../../optionWhen'
import { homeRouter } from '../../../route'
import { RoomsClient } from '../../../rpc'
import {
  ClearSession,
  CopyRoomId,
  FocusRoomPageUsernameInput,
  JoinRoom,
  SavePlayerSession,
  StartGame,
  UpdatePlayerProgress,
  WaitBeforeHidingRoomIdCopiedIndicator,
  WaitForExitCountdownInterval,
} from '../command'
import { Message } from '../message'
import { Model, RoomAsyncData } from '../model'
import { validateUserTextInput } from '../userGameText'
import { handleRoomUpdated } from './handleRoomUpdates'

const NavigateHome = Command.define('NavigateHome', {
  messages: [Message.CompletedNavigateHome],
  execute: pushUrl(homeRouter()).pipe(
    Effect.as(Message.CompletedNavigateHome()),
  ),
})

export type UpdateReturn = Update.Return<Model, Message, RoomsClient>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

/** Per-dispatch parent state the Room page needs from the root.
 *  `roomId` comes from the current Room route when the user is on the
 *  Room page, or from the just-created room when the join flow
 *  bridges from Home. */
export type Context = Readonly<{
  roomId: string
}>

export const update = (model: Model, message: Message, context: Context) =>
  Message.match<UpdateReturn>(message, {
    PressedKey: handleKeyPressed(model),

    ChangedUserText: ({ value }) => {
      const maybeRoom = AsyncData.getData(model.roomAsyncData)

      const maybeGameText = pipe(
        maybeRoom,
        Option.flatMap(({ maybeGame }) => maybeGame),
        Option.map(({ text }) => text),
      )

      const userGameText = validateUserTextInput(value, maybeGameText)

      const newCharsTyped = pipe(
        String.length(userGameText) - String.length(model.userGameText),
        Number.max(0),
      )
      const nextCharsTyped = model.charsTyped + newCharsTyped

      const commands = pipe(
        Option.all([
          model.maybeSession,
          Option.flatMap(maybeRoom, ({ maybeGame }) => maybeGame),
        ]),
        Option.map(([session, game]) =>
          UpdatePlayerProgress({
            playerId: session.player.id,
            gameId: game.id,
            userGameText,
            charsTyped: nextCharsTyped,
          }),
        ),
      )

      return {
        model: evo(model, {
          userGameText: () => userGameText,
          charsTyped: () => nextCharsTyped,
        }),
        commands: Array.fromOption(commands),
      }
    },

    BlurredRoomPageUsernameInput: () => ({
      model,
      commands: [FocusRoomPageUsernameInput()],
    }),

    ChangedRoomPageUsername: ({ value }) => ({
      model: evo(model, {
        username: () => value,
      }),
    }),

    SubmittedJoinRoomFromPage: () => {
      const maybeJoinRoom = optionWhen(String.isNonEmpty(model.username), () =>
        JoinRoom({ username: model.username, roomId: context.roomId }),
      )

      return { model, commands: Array.fromOption(maybeJoinRoom) }
    },

    UpdatedRoom: handleRoomUpdated(model),

    FailedStreamRoom: ({ error: _error }) => {
      return { model }
    },

    CompletedLoadSession: ({ maybeSession }) => {
      const maybeFocus = optionWhen(
        Option.isNone(maybeSession) && AsyncData.isSuccess(model.roomAsyncData),
        () => FocusRoomPageUsernameInput(),
      )
      return {
        model: evo(model, {
          maybeSession: () => maybeSession,
        }),
        commands: Array.fromOption(maybeFocus),
      }
    },

    SucceededFetchRoom: ({ room }) => {
      const maybeFocus = optionWhen(Option.isNone(model.maybeSession), () =>
        FocusRoomPageUsernameInput(),
      )
      return {
        model: evo(model, {
          roomAsyncData: () => RoomAsyncData.Success({ data: room }),
        }),
        commands: Array.fromOption(maybeFocus),
      }
    },

    FailedFetchRoom: () => ({
      model: evo(model, {
        roomAsyncData: () => RoomAsyncData.Failure({ error: 'Room not found' }),
      }),
    }),

    ClickedCopyRoomId: () => ({
      model,
      commands: [CopyRoomId({ roomId: context.roomId })],
    }),

    SucceededCopyRoomId: () =>
      model.isRoomIdCopyIndicatorVisible
        ? { model }
        : {
            model: evo(model, {
              isRoomIdCopyIndicatorVisible: () => true,
            }),
            commands: [WaitBeforeHidingRoomIdCopiedIndicator()],
          },

    CompletedWaitBeforeHidingRoomIdCopiedIndicator: () => ({
      model: evo(model, {
        isRoomIdCopyIndicatorVisible: () => false,
      }),
    }),

    CompletedWaitForExitCountdownInterval: () => {
      const nextSecondsLeft = Number.decrement(model.exitCountdownSecondsLeft)
      const maybeTick = optionWhen(nextSecondsLeft > 0, () =>
        WaitForExitCountdownInterval(),
      )

      return {
        model: evo(model, {
          exitCountdownSecondsLeft: () => nextSecondsLeft,
        }),
        commands: Array.fromOption(maybeTick),
      }
    },

    SucceededJoinRoom: ({ player }) => {
      const session = { roomId: context.roomId, player }
      return {
        model: evo(model, {
          maybeSession: () => Option.some(session),
        }),
        commands: [SavePlayerSession({ session })],
      }
    },
    CompletedFocusRoomPageUsernameInput: () => ({ model }),
    CompletedFocusUserGameTextInput: () => ({ model }),
    CompletedNavigateHome: () => ({ model }),
    SucceededStartGame: () => ({ model }),
    FailedStartGame: () => ({ model }),
    CompletedUpdatePlayerProgress: () => ({ model }),
    CompletedSavePlayerSession: () => ({ model }),
    CompletedClearSession: () => ({ model }),
    FailedJoinRoom: () => ({ model }),
    FailedCopyRoomId: () => ({ model }),
  })

const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    Option.match(AsyncData.getData(model.roomAsyncData), {
      onNone: () => ({ model }),
      onSome: room =>
        Match.value(room.status).pipe(
          withUpdateReturn,
          Match.tag('Waiting', () => whenWaiting(model, key, room)),
          Match.tag('Finished', () => whenFinished(model, key, room)),
          Match.orElse(() => ({ model })),
        ),
    })

const whenWaiting = (
  model: Model,
  key: string,
  room: Shared.Room,
): UpdateReturn =>
  Match.value(key).pipe(
    withUpdateReturn,
    Match.when('Backspace', () => leaveRoom(model)),
    Match.when('Enter', handleStartGame(model, room)),
    Match.orElse(() => ({ model })),
  )

const whenFinished = (
  model: Model,
  key: string,
  room: Shared.Room,
): UpdateReturn =>
  Match.value(key).pipe(
    withUpdateReturn,
    Match.when('Backspace', () =>
      model.exitCountdownSecondsLeft === 0 ? leaveRoom(model) : { model },
    ),
    Match.when('Enter', handleStartGame(model, room)),
    Match.orElse(() => ({ model })),
  )

const leaveRoom = (model: Model): UpdateReturn => ({
  model: evo(model, {
    maybeSession: () => Option.none(),
    roomAsyncData: () => RoomAsyncData.Loading(),
  }),
  commands: [ClearSession(), NavigateHome()],
})

const handleStartGame = (model: Model, room: Shared.Room) => (): UpdateReturn =>
  Option.match(model.maybeSession, {
    onSome: session => {
      const isHost = session.player.id === room.hostId
      const maybeStartGame = optionWhen(isHost, () =>
        StartGame({ roomId: room.id, playerId: session.player.id }),
      )
      return { model, commands: Array.fromOption(maybeStartGame) }
    },
    onNone: () => ({ model }),
  })

export const informJoined = (
  model: Model,
  player: Shared.Player,
  context: Context,
): UpdateReturn => update(model, Message.SucceededJoinRoom({ player }), context)
