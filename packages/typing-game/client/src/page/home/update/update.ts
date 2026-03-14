import { Array, Effect, Match as M, Option, String as Str } from 'effect'
import { Task } from 'foldkit'
import { Command } from 'foldkit/command'
import { evo } from 'foldkit/struct'

import { joinRoom } from '../../../command'
import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../../constant'
import { optionWhen } from '../../../optionWhen'
import { createRoom } from '../command'
import {
  CompletedRoomIdInputFocus,
  CompletedUsernameInputFocus,
  Message,
  type OutMessage,
  SucceededRoomCreation,
  SucceededRoomJoin,
} from '../message'
import { EnterRoomId, EnterUsername, Model, SelectAction } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

export type UpdateReturn = [
  Model,
  ReadonlyArray<Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedUsernameInputFocus: () => [model, [], Option.none()],

      CompletedRoomIdInputFocus: () => [model, [], Option.none()],

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

            return [nextModel, [], Option.none()]
          }),
          M.orElse(() => [model, [], Option.none()]),
        ),

      PressedKey: message => [
        ...handleKeyPressed(model)(message),
        Option.none(),
      ],

      ChangedUsername: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', () => [
            evo(model, {
              homeStep: () => EnterUsername({ username: value }),
              formError: () => Option.none(),
            }),
            [],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      BlurredUsernameInput: () => [
        model,
        [
          Task.focus(`#${USERNAME_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(CompletedUsernameInputFocus()),
          ),
        ],
        Option.none(),
      ],

      BlurredRoomIdInput: () => [
        model,
        [
          Task.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(CompletedRoomIdInputFocus()),
          ),
        ],
        Option.none(),
      ],

      ChangedRoomId: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterRoomId', ({ username, roomIdValidationId }) => [
            evo(model, {
              homeStep: () =>
                EnterRoomId({
                  username,
                  roomId: value,
                  roomIdValidationId,
                }),
              formError: () => Option.none(),
            }),
            [],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      ClickedCreateRoom: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('SelectAction', ({ username }) => [
            model,
            [createRoom(username)],
            Option.none(),
          ]),
          M.orElse(() => [model, [], Option.none()]),
        ),

      ClickedJoinRoom: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterRoomId', ({ username, roomId }) => {
            if (roomId === 'exit') {
              return [
                evo(model, {
                  homeStep: () =>
                    SelectAction({ username, selectedAction: 'JoinRoom' }),
                }),
                [],
                Option.none(),
              ]
            }

            const maybeJoin = optionWhen(Str.isNonEmpty(roomId), () =>
              joinRoom(username, roomId),
            )

            return [model, Array.fromOption(maybeJoin), Option.none()]
          }),
          M.orElse(() => [model, [], Option.none()]),
        ),

      CreatedRoom: ({ roomId, player }) => [
        model,
        [],
        Option.some(SucceededRoomCreation({ roomId, player })),
      ],

      JoinedRoom: ({ roomId, player }) => [
        model,
        [],
        Option.some(SucceededRoomJoin({ roomId, player })),
      ],

      FailedRoom: ({ error }) => [
        evo(model, {
          formError: () => Option.some(error),
        }),
        [],
        Option.none(),
      ],
    }),
  )
