import { Array, Effect, Match as M, Option, String as Str } from 'effect'
import { Command, Task } from 'foldkit'
import { evo } from 'foldkit/struct'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../../constant'
import { optionWhen } from '../../../optionWhen'
import { createRoom, joinRoom } from '../command'
import {
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  Message,
  type OutMessage,
} from '../message'
import { EnterRoomId, EnterUsername, Model, SelectAction } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

const FocusUsernameInput = Command.define(
  'FocusUsernameInput',
  CompletedFocusUsernameInput,
)
const FocusRoomIdInput = Command.define(
  'FocusRoomIdInput',
  CompletedFocusRoomIdInput,
)

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedFocusUsernameInput: () => [model, [], Option.none()],

      CompletedFocusRoomIdInput: () => [model, [], Option.none()],

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
          FocusUsernameInput(
            Task.focus(`#${USERNAME_INPUT_ID}`).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusUsernameInput()),
            ),
          ),
        ],
        Option.none(),
      ],

      BlurredRoomIdInput: () => [
        model,
        [
          FocusRoomIdInput(
            Task.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusRoomIdInput()),
            ),
          ),
        ],
        Option.none(),
      ],

      ChangedRoomId: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterRoomId', ({ username }) => [
            evo(model, {
              homeStep: () =>
                EnterRoomId({
                  username,
                  roomId: value,
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

      SubmittedJoinRoomForm: () =>
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

      SucceededCreateRoom: outMessage => [model, [], Option.some(outMessage)],

      SucceededJoinRoom: outMessage => [model, [], Option.some(outMessage)],

      FailedJoinRoom: ({ error }) => [
        evo(model, {
          formError: () => Option.some(error),
        }),
        [],
        Option.none(),
      ],
    }),
  )
