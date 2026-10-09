import { Array, Layer, Match, Option, String } from 'effect'
import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import {
  CommandsLayer,
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoomFromHome,
} from '../command'
import { Message, OutMessage } from '../message'
import { HomeStep, Model } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  Layer.Success<typeof CommandsLayer>
>
export type UpdateRequirements = Layer.Success<typeof CommandsLayer>
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
            ? modifyFields(model, {
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
          model: modifyFields(model, {
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
          model: modifyFields(model, {
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
              model: modifyFields(model, {
                homeStep: () =>
                  HomeStep.SelectAction({
                    username,
                    selectedAction: 'JoinRoom',
                  }),
              }),
            }
          }

          const maybeJoin = optionWhen(String.isNonEmpty(roomId), () =>
            JoinRoomFromHome({ username, roomId }),
          )

          return { model, commands: Array.fromOption(maybeJoin) }
        }),
        Match.orElse(() => ({ model })),
      ),

    SucceededCreateRoom: ({ roomId, player }) => ({
      model,
      outMessage: OutMessage.CreatedRoom({ roomId, player }),
    }),

    SucceededJoinRoomFromHome: ({ roomId, player }) => ({
      model,
      outMessage: OutMessage.JoinedRoom({ roomId, player }),
    }),

    FailedCreateRoom: ({ error }) => ({
      model: modifyFields(model, {
        formError: () => Option.some(error),
      }),
    }),

    FailedJoinRoomFromHome: ({ error }) => ({
      model: modifyFields(model, {
        formError: () => Option.some(error),
      }),
    }),
  })
