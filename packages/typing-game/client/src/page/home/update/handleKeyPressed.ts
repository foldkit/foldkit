import { Array, Match, Number, Option, flow, pipe } from 'effect'
import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { RoomsClient } from '../../../rpc'
import { CreateRoom, FocusRoomIdInput, FocusUsernameInput } from '../command'
import { Message } from '../message'
import { HOME_ACTIONS, HomeAction, HomeStep, Model } from '../model'

type UpdateReturn = Update.Return<Model, Message, RoomsClient>
const withUpdateReturn = Match.withReturnType<UpdateReturn>()

export const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    Match.value(model.homeStep).pipe(
      withUpdateReturn,
      Match.tag('SelectAction', whenSelectAction(model, key)),
      Match.orElse(() => ({ model })),
    )

const whenSelectAction =
  (model: Model, key: string) =>
  (selectAction: typeof HomeStep.SelectAction.Type): UpdateReturn =>
    Match.value(key).pipe(
      withUpdateReturn,
      Match.when('ArrowUp', () =>
        moveSelection(Number.decrement)(model, selectAction),
      ),
      Match.when('ArrowDown', () =>
        moveSelection(Number.increment)(model, selectAction),
      ),
      Match.when('Enter', () => confirmSelection(model)(selectAction)),
      Match.orElse(() => ({ model })),
    )

const moveSelection =
  (f: (index: number) => number) =>
  (
    model: Model,
    { username, selectedAction }: typeof HomeStep.SelectAction.Type,
  ): UpdateReturn => ({
    model: evo(model, {
      homeStep: () =>
        HomeStep.SelectAction({
          username,
          selectedAction: cycleAction(f)(selectedAction),
        }),
    }),
  })

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
          nextIndex => Array.getUnsafe(HOME_ACTIONS, nextIndex),
        ),
      ),
      Option.getOrElse(() => selectedAction),
    )
  }

const confirmSelection =
  (model: Model) =>
  (selectAction: typeof HomeStep.SelectAction.Type): UpdateReturn =>
    Match.value(selectAction.selectedAction).pipe(
      withUpdateReturn,
      Match.when('CreateRoom', () => ({
        model,
        commands: [CreateRoom({ username: selectAction.username })],
      })),
      Match.when('JoinRoom', () => ({
        model: evo(model, {
          homeStep: () =>
            HomeStep.EnterRoomId({
              username: selectAction.username,
              roomId: '',
            }),
        }),
        commands: [FocusRoomIdInput()],
      })),
      Match.when('ChangeUsername', () => ({
        model: evo(model, {
          homeStep: () => HomeStep.EnterUsername({ username: '' }),
        }),
        commands: [FocusUsernameInput()],
      })),
      Match.exhaustive,
    )
