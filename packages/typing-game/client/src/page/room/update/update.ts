import { Array, Effect, Match, Number, Option, String, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { optionWhen } from '../../../optionWhen'
import { homeRouter } from '../../../route'
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
import { Room, RoomComposition } from '../definition'
import { Message } from '../message'
import { Model, RoomAsyncData, RoomPlayerSession } from '../model'
import { validateUserTextInput } from '../userGameText'
import { handleRoomUpdated } from './handleRoomUpdated'

export const NavigateHome = Room.command('NavigateHome', {
  messages: [Message.CompletedNavigateHome],
  handler: function* () {
    return () =>
      pushUrl(homeRouter()).pipe(Effect.as(Message.CompletedNavigateHome()))
  },
})

/**
 * The Room occurrence handling this dispatch. The parent supplies the captured
 * binding key after checking it against the active Route, or the known room ID
 * when preparing a newly joined Room from Home.
 */
export type Context = Readonly<{
  roomId: string
}>

export const update = RoomComposition.makeUpdate(
  (model, message, context: Context) =>
    Message.match(message, {
      PressedKey: handleKeyPressed(model, context),

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
          model: modifyFields(model, {
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
        model: modifyFields(model, {
          username: () => value,
        }),
      }),

      SubmittedJoinRoomFromPage: () => {
        const maybeJoinRoom = optionWhen(
          String.isNonEmpty(model.username),
          () => JoinRoom({ username: model.username, roomId: context.roomId }),
        )

        return { model, commands: Array.fromOption(maybeJoinRoom) }
      },

      UpdatedRoom: handleRoomUpdated(model),

      FailedStreamRoom: ({ error: _error }) => {
        return { model }
      },

      CompletedLoadSession: ({ maybeSession }) => {
        const maybeFocus = optionWhen(
          Option.isNone(maybeSession) &&
            AsyncData.isSuccess(model.roomAsyncData),
          () => FocusRoomPageUsernameInput(),
        )
        return {
          model: modifyFields(model, {
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
          model: modifyFields(model, {
            roomAsyncData: () => RoomAsyncData.Success({ data: room }),
          }),
          commands: Array.fromOption(maybeFocus),
        }
      },

      FailedFetchRoom: () => ({
        model: modifyFields(model, {
          roomAsyncData: () =>
            RoomAsyncData.Failure({ error: 'Room not found' }),
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
              model: modifyFields(model, {
                isRoomIdCopyIndicatorVisible: () => true,
              }),
              commands: [WaitBeforeHidingRoomIdCopiedIndicator()],
            },

      CompletedWaitBeforeHidingRoomIdCopiedIndicator: () => ({
        model: modifyFields(model, {
          isRoomIdCopyIndicatorVisible: () => false,
        }),
      }),

      CompletedWaitForExitCountdownInterval: () => {
        const nextSecondsLeft = Number.decrement(model.exitCountdownSecondsLeft)
        const maybeTick = optionWhen(nextSecondsLeft > 0, () =>
          WaitForExitCountdownInterval(),
        )

        return {
          model: modifyFields(model, {
            exitCountdownSecondsLeft: () => nextSecondsLeft,
          }),
          commands: Array.fromOption(maybeTick),
        }
      },

      SucceededJoinRoom: ({ player }) => {
        const session = RoomPlayerSession.make({
          roomId: context.roomId,
          player,
        })

        return {
          model: modifyFields(model, {
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
    }),
)

const handleKeyPressed =
  (model: Model, context: Context) =>
  ({ key }: { key: string }) =>
    Option.match(AsyncData.getData(model.roomAsyncData), {
      onNone: () => ({ model }),
      onSome: room =>
        Match.value(room.status).pipe(
          Match.tag('Waiting', () => whenWaiting(model, context, key, room)),
          Match.tag('Finished', () => whenFinished(model, context, key, room)),
          Match.orElse(() => ({ model })),
        ),
    })

const whenWaiting = (
  model: Model,
  context: Context,
  key: string,
  room: Shared.Room,
) =>
  Match.value(key).pipe(
    Match.when('Backspace', () => leaveRoom(model, context.roomId)),
    Match.when('Enter', handleStartGame(model, context.roomId, room)),
    Match.orElse(() => ({ model })),
  )

const whenFinished = (
  model: Model,
  context: Context,
  key: string,
  room: Shared.Room,
) =>
  Match.value(key).pipe(
    Match.when('Backspace', () =>
      model.exitCountdownSecondsLeft === 0
        ? leaveRoom(model, context.roomId)
        : { model },
    ),
    Match.when('Enter', handleStartGame(model, context.roomId, room)),
    Match.orElse(() => ({ model })),
  )

const leaveRoom = (model: Model, roomId: string) => ({
  model: modifyFields(model, {
    maybeSession: () => Option.none(),
    roomAsyncData: () => RoomAsyncData.Loading(),
  }),
  commands: [ClearSession({ roomId }), NavigateHome()],
})

const handleStartGame =
  (model: Model, roomId: string, room: Shared.Room) => () =>
    Option.match(model.maybeSession, {
      onSome: session => {
        const isHost = session.player.id === room.hostId
        const maybeStartGame = optionWhen(isHost, () =>
          StartGame({ roomId, playerId: session.player.id }),
        )
        return { model, commands: Array.fromOption(maybeStartGame) }
      },
      onNone: () => ({ model }),
    })

export const informJoined = Room.step(
  (model, player: Shared.Player, context: Context) =>
    update(model, Message.SucceededJoinRoom({ player }), context),
)
