import { Array, Match, Number, Option, flow, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { CreateRoom, FocusRoomIdInput, FocusUsernameInput } from '../command'
import { HOME_ACTIONS, HomeAction, HomeStep, Model } from '../model'

export const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }) =>
    Match.value(model.homeStep).pipe(
      Match.tag('SelectAction', whenSelectAction(model, key)),
      Match.orElse(() => ({ model })),
    )

const whenSelectAction =
  (model: Model, key: string) =>
  (selectAction: typeof HomeStep.SelectAction.Type) =>
    Match.value(key).pipe(
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
  ) => ({
    model: modifyFields(model, {
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
  (model: Model) => (selectAction: typeof HomeStep.SelectAction.Type) =>
    Match.value(selectAction.selectedAction).pipe(
      Match.when('CreateRoom', () => ({
        model,
        commands: [CreateRoom({ username: selectAction.username })],
      })),
      Match.when('JoinRoom', () => ({
        model: modifyFields(model, {
          homeStep: () =>
            HomeStep.EnterRoomId({
              username: selectAction.username,
              roomId: '',
            }),
        }),
        commands: [FocusRoomIdInput()],
      })),
      Match.when('ChangeUsername', () => ({
        model: modifyFields(model, {
          homeStep: () => HomeStep.EnterUsername({ username: '' }),
        }),
        commands: [FocusUsernameInput()],
      })),
      Match.exhaustive,
    )
