import { Array, Match, Option, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { optionWhen } from '../../../optionWhen'
import {
  FocusRoomIdInput,
  FocusUsernameInput,
  JoinRoomFromHome,
} from '../command'
import { HomeComposition } from '../composition'
import { HomeDefinition } from '../definition'
import { OutMessage } from '../message'
import { HomeStep } from '../model'
import { handlePressedKey } from './handlePressedKey'

export const update = HomeComposition.makeUpdate({
  CompletedFocusUsernameInput: HomeDefinition.makeNoopStep(),

  CompletedFocusRoomIdInput: HomeDefinition.makeNoopStep(),

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

  BlurredUsernameInput: HomeDefinition.makeCommandsStep(() => [
    FocusUsernameInput(),
  ]),

  BlurredRoomIdInput: HomeDefinition.makeCommandsStep(() => [
    FocusRoomIdInput(),
  ]),

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

  SucceededCreateRoom: HomeDefinition.makeOutMessageStep.fromMessage(
    ({ roomId, player }) => OutMessage.CreatedRoom({ roomId, player }),
  ),

  SucceededJoinRoomFromHome: HomeDefinition.makeOutMessageStep.fromMessage(
    ({ roomId, player }) => OutMessage.JoinedRoom({ roomId, player }),
  ),

  FailedCreateRoom: HomeDefinition.makeFieldsStep.fromMessage(({ error }) => ({
    formError: () => Option.some(error),
  })),

  FailedJoinRoomFromHome: HomeDefinition.makeFieldsStep.fromMessage(
    ({ error }) => ({
      formError: () => Option.some(error),
    }),
  ),
})
