// @ts-nocheck
import { Array, Effect, Match as M, Number, Option, flow, pipe } from 'effect'
import { Command, Task } from 'foldkit'
import { evo } from 'foldkit/struct'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../../constant'
import { createRoom } from '../command'
import {
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  Message,
} from '../message'
import {
  EnterRoomId,
  EnterUsername,
  HOME_ACTIONS,
  HomeAction,
  Model,
  SelectAction,
} from '../model'

export const FocusRoomIdInput = Command.define(
  'FocusRoomIdInput',
  CompletedFocusRoomIdInput,
)
export const FocusUsernameInput = Command.define(
  'FocusUsernameInput',
  CompletedFocusUsernameInput,
)

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    M.value(model.homeStep).pipe(
      withUpdateReturn,
      M.tag('SelectAction', whenSelectAction(model, key)),
      M.orElse(() => [model, []]),
    )

const whenSelectAction =
  (model: Model, key: string) =>
  (selectAction: SelectAction): UpdateReturn =>
    M.value(key).pipe(
      withUpdateReturn,
      M.when('ArrowUp', () =>
        moveSelection(Number.decrement)(model, selectAction),
      ),
      M.when('ArrowDown', () =>
        moveSelection(Number.increment)(model, selectAction),
      ),
      M.when('Enter', () => confirmSelection(model)(selectAction)),
      M.orElse(() => [model, []]),
    )

const moveSelection =
  (f: (index: number) => number) =>
  (model: Model, { username, selectedAction }: SelectAction): UpdateReturn => [
    evo(model, {
      homeStep: () =>
        SelectAction({
          username,
          selectedAction: cycleAction(f)(selectedAction),
        }),
    }),
    [],
  ]

const cycleAction =
  (f: (a: number) => number) => (selectedAction: HomeAction) => {
    const homeActionsLength = Array.length(HOME_ACTIONS)

    return pipe(
      HOME_ACTIONS,
      Array.findFirstIndex(action => action === selectedAction),
      Option.map(
        flow(
          f,
          Number.remainder(homeActionsLength),
          remainder =>
            remainder < 0 ? remainder + homeActionsLength : remainder,
          nextIndex => Array.unsafeGet(HOME_ACTIONS, nextIndex),
        ),
      ),
      Option.getOrElse(() => selectedAction),
    )
  }

const confirmSelection =
  (model: Model) =>
  (selectAction: SelectAction): UpdateReturn =>
    M.value(selectAction.selectedAction).pipe(
      withUpdateReturn,
      M.when('CreateRoom', () => [model, [createRoom(selectAction.username)]]),
      M.when('JoinRoom', () => [
        evo(model, {
          homeStep: () =>
            EnterRoomId({
              username: selectAction.username,
              roomId: '',
            }),
        }),
        [
          FocusRoomIdInput(
            Task.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusRoomIdInput()),
            ),
          ),
        ],
      ]),
      M.when('ChangeUsername', () => [
        evo(model, {
          homeStep: () => EnterUsername({ username: '' }),
        }),
        [
          FocusUsernameInput(
            Task.focus(`#${USERNAME_INPUT_ID}`).pipe(
              Effect.ignore,
              Effect.as(CompletedFocusUsernameInput()),
            ),
          ),
        ],
      ]),
      M.exhaustive,
    )
