import { Array, Match as M, Option, String as Str } from 'effect'
import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import { RoomsClient } from '../../../rpc'
import { FocusRoomIdInput, FocusUsernameInput, JoinRoom } from '../command'
import { Message, OutMessage } from '../message'
import { EnterRoomId, EnterUsername, Model, SelectAction } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  RoomsClient
>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedFocusUsernameInput: () => ({ model }),

    CompletedFocusRoomIdInput: () => ({ model }),

    SubmittedUsernameForm: () =>
      M.value(model.homeStep).pipe(
        withUpdateReturn,
        M.tag('EnterUsername', ({ username }) => {
          const nextModel = Str.isNonEmpty(username)
            ? evo(model, {
                homeStep: () =>
                  SelectAction({ username, selectedAction: 'CreateRoom' }),
              })
            : model

          return { model: nextModel }
        }),
        M.orElse(() => ({ model })),
      ),

    PressedKey: message => handleKeyPressed(model)(message),

    ChangedUsername: ({ value }) =>
      M.value(model.homeStep).pipe(
        withUpdateReturn,
        M.tag('EnterUsername', () => ({
          model: evo(model, {
            homeStep: () => EnterUsername({ username: value }),
            formError: () => Option.none(),
          }),
        })),
        M.orElse(() => ({ model })),
      ),

    BlurredUsernameInput: () => ({ model, commands: [FocusUsernameInput()] }),

    BlurredRoomIdInput: () => ({ model, commands: [FocusRoomIdInput()] }),

    ChangedRoomId: ({ value }) =>
      M.value(model.homeStep).pipe(
        withUpdateReturn,
        M.tag('EnterRoomId', ({ username }) => ({
          model: evo(model, {
            homeStep: () =>
              EnterRoomId({
                username,
                roomId: value,
              }),
            formError: () => Option.none(),
          }),
        })),
        M.orElse(() => ({ model })),
      ),

    SubmittedJoinRoomForm: () =>
      M.value(model.homeStep).pipe(
        withUpdateReturn,
        M.tag('EnterRoomId', ({ username, roomId }) => {
          if (roomId === 'exit') {
            return {
              model: evo(model, {
                homeStep: () =>
                  SelectAction({ username, selectedAction: 'JoinRoom' }),
              }),
            }
          }

          const maybeJoin = optionWhen(Str.isNonEmpty(roomId), () =>
            JoinRoom({ username, roomId }),
          )

          return { model, commands: Array.fromOption(maybeJoin) }
        }),
        M.orElse(() => ({ model })),
      ),

    SucceededCreateRoom: ({ roomId, player }) => ({
      model,
      outMessage: OutMessage.CreatedRoom({ roomId, player }),
    }),

    SucceededJoinRoom: ({ roomId, player }) => ({
      model,
      outMessage: OutMessage.JoinedRoom({ roomId, player }),
    }),

    FailedCreateRoom: ({ error }) => ({
      model: evo(model, {
        formError: () => Option.some(error),
      }),
    }),

    FailedJoinRoom: ({ error }) => ({
      model: evo(model, {
        formError: () => Option.some(error),
      }),
    }),
  })
