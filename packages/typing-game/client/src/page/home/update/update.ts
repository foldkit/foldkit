import { Array, Match, Option, String } from 'effect'
import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import { RoomsClient } from '../../../rpc'
import { FocusRoomIdInput, FocusUsernameInput, JoinRoom } from '../command'
import { Message, OutMessage } from '../message'
import { HomeStep, Model } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  RoomsClient
>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedFocusUsernameInput: () => ({ model }),

    CompletedFocusRoomIdInput: () => ({ model }),

    SubmittedUsernameForm: () =>
      Match.value(model.homeStep).pipe(
        withUpdateReturn,
        Match.tag('EnterUsername', ({ username }) => {
          const nextModel = String.isNonEmpty(username)
            ? evo(model, {
                homeStep: () =>
                  HomeStep.SelectAction({
                    username,
                    selectedAction: 'CreateRoom',
                  }),
              })
            : model

          return { model: nextModel }
        }),
        Match.orElse(() => ({ model })),
      ),

    PressedKey: message => handleKeyPressed(model)(message),

    ChangedUsername: ({ value }) =>
      Match.value(model.homeStep).pipe(
        withUpdateReturn,
        Match.tag('EnterUsername', () => ({
          model: evo(model, {
            homeStep: () => HomeStep.EnterUsername({ username: value }),
            formError: () => Option.none(),
          }),
        })),
        Match.orElse(() => ({ model })),
      ),

    BlurredUsernameInput: () => ({ model, commands: [FocusUsernameInput()] }),

    BlurredRoomIdInput: () => ({ model, commands: [FocusRoomIdInput()] }),

    ChangedRoomId: ({ value }) =>
      Match.value(model.homeStep).pipe(
        withUpdateReturn,
        Match.tag('EnterRoomId', ({ username }) => ({
          model: evo(model, {
            homeStep: () =>
              HomeStep.EnterRoomId({
                username,
                roomId: value,
              }),
            formError: () => Option.none(),
          }),
        })),
        Match.orElse(() => ({ model })),
      ),

    SubmittedJoinRoomForm: () =>
      Match.value(model.homeStep).pipe(
        withUpdateReturn,
        Match.tag('EnterRoomId', ({ username, roomId }) => {
          if (roomId === 'exit') {
            return {
              model: evo(model, {
                homeStep: () =>
                  HomeStep.SelectAction({
                    username,
                    selectedAction: 'JoinRoom',
                  }),
              }),
            }
          }

          const maybeJoin = optionWhen(String.isNonEmpty(roomId), () =>
            JoinRoom({ username, roomId }),
          )

          return { model, commands: Array.fromOption(maybeJoin) }
        }),
        Match.orElse(() => ({ model })),
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
