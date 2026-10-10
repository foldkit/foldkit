import { Array, Match, Option, String } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import {
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoomFromHome,
} from '../command'
import { Message, OutMessage } from '../message'
import { HomeStep, Model } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    CompletedFocusUsernameInput: () => ({ model }),

    CompletedFocusRoomIdInput: () => ({ model }),

    SubmittedUsernameForm: () =>
      Match.value(model.homeStep).pipe(
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
  }),
)

export type UpdateRequirements = Update.RequirementsOf<typeof update>
