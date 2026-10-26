import { Array, Match, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import {
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoomFromHome,
} from '../command'
import { HomeComposition } from '../composition'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
} from '../definition'
import { OutMessage } from '../message'
import { HomeStep } from '../model'
import { handlePressedKey } from './handlePressedKey'

export const update = HomeComposition.makeUpdate({
  CompletedFocusUsernameInput: makeNoopStep(),

  CompletedFocusRoomIdInput: makeNoopStep(),

  SubmittedUsernameForm: model =>
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

  PressedKey: (model, message) => handlePressedKey(model)(message),

  ChangedUsername: (model, { value }) =>
    Match.value(model.homeStep).pipe(
      Match.tag('EnterUsername', () => ({
        model: modifyFields(model, {
          homeStep: () => HomeStep.EnterUsername({ username: value }),
          formError: () => Option.none(),
        }),
      })),
      Match.orElse(() => ({ model })),
    ),

  BlurredUsernameInput: makeCommandsStep(() => [FocusUsernameInput()]),

  BlurredRoomIdInput: makeCommandsStep(() => [FocusRoomIdInput()]),

  ChangedRoomId: (model, { value }) =>
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

  SubmittedJoinRoomForm: model =>
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

  SucceededCreateRoom: makeOutMessageStep.fromMessage(({ roomId, player }) =>
    OutMessage.CreatedRoom({ roomId, player }),
  ),

  SucceededJoinRoomFromHome: makeOutMessageStep.fromMessage(
    ({ roomId, player }) => OutMessage.JoinedRoom({ roomId, player }),
  ),

  FailedCreateRoom: makeFieldsStep.fromMessage(({ error }) => ({
    formError: () => Option.some(error),
  })),

  FailedJoinRoomFromHome: makeFieldsStep.fromMessage(({ error }) => ({
    formError: () => Option.some(error),
  })),
})
