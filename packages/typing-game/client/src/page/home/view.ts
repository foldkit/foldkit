import { Array, Match as M, Option } from 'effect'
import { Html } from 'foldkit/html'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import type { Message as ParentMessage } from '../../message'
import {
  Autocapitalize,
  Autocomplete,
  Autocorrect,
  Class,
  For,
  Id,
  Maxlength,
  Name,
  OnBlur,
  OnInput,
  OnSubmit,
  Spellcheck,
  Type,
  Value,
  div,
  empty,
  form,
  h1,
  h2,
  input,
  label,
  span,
} from '../../view/html'
import {
  BlurredRoomIdInput,
  BlurredUsernameInput,
  ChangedRoomId,
  ChangedUsername,
  ClickedJoinRoom,
  SubmittedUsernameForm,
} from './message'
import type { Message } from './message'
import {
  EnterRoomId,
  EnterUsername,
  HOME_ACTIONS,
  HomeAction,
  Model,
  SelectAction,
  homeActionToLabel,
} from './model'

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const maybeUsername = M.value(model.homeStep).pipe(
    M.tagsExhaustive({
      EnterUsername: () => Option.none(),
      SelectAction: ({ username }) => Option.some(username),
      EnterRoomId: ({ username }) => Option.some(username),
    }),
  )

  const welcomeText = Option.match(maybeUsername, {
    onNone: () => empty,
    onSome: username => h2([Class('mb-6')], [`Welcome, ${username}!`]),
  })

  return div(
    [Class('max-w-4xl')],
    [
      h1([Class('mb-6 uppercase')], ['Typing Terminal']),
      welcomeText,

      M.value(model.homeStep).pipe(
        M.tagsExhaustive({
          EnterUsername: enterUsername(toMessage),
          SelectAction: selectAction,
          EnterRoomId: enterRoomId(toMessage),
        }),
      ),

      maybeErrorMessage(model.formError),
    ],
  )
}

const enterUsername =
  (toMessage: (message: Message) => ParentMessage) =>
  ({ username }: EnterUsername): Html =>
    form(
      [OnSubmit(toMessage(SubmittedUsernameForm()))],
      [
        div(
          [Class('flex items-center gap-2')],
          [
            label([For(USERNAME_INPUT_ID)], ['Enter username: ']),
            div(
              [Class('flex items-center gap-2 flex-1')],
              [
                // Safari ignores fields named "search" for password autofill
                input([
                  Id(USERNAME_INPUT_ID),
                  Name('search'),
                  Type('text'),
                  Value(username),
                  Class('bg-transparent px-0 py-2 outline-none w-full'),
                  OnInput(value => toMessage(ChangedUsername({ value }))),
                  OnBlur(toMessage(BlurredUsernameInput())),
                  Autocapitalize('none'),
                  Spellcheck(false),
                  Autocorrect('off'),
                  Autocomplete('off'),
                  Maxlength(24),
                ]),
              ],
            ),
          ],
        ),
      ],
    )

const selectAction = ({ selectedAction }: SelectAction): Html =>
  div(
    [Class('space-y-4')],
    [
      ...Array.map(HOME_ACTIONS, action(selectedAction)),
      div(
        [Class('text-terminal-green mt-8')],
        ['(↑↓ to navigate, Enter to select)'],
      ),
    ],
  )

const action =
  (selectedAction: HomeAction) =>
  (homeAction: HomeAction): Html =>
    div(
      [Class('whitespace-pre-wrap')],
      [
        selectedAction === homeAction ? '> ' : '  ',
        homeActionToLabel(homeAction),
      ],
    )

const enterRoomId =
  (toMessage: (message: Message) => ParentMessage) =>
  ({ roomId }: EnterRoomId): Html =>
    form(
      [OnSubmit(toMessage(ClickedJoinRoom()))],
      [
        div(
          [Class('flex items-center gap-2')],
          [
            label(
              [For(ROOM_ID_INPUT_ID)],
              ['Enter room ID (or "exit" to go back): '],
            ),
            div(
              [Class('flex items-center gap-2 flex-1')],
              [
                input([
                  Id(ROOM_ID_INPUT_ID),
                  Type('text'),
                  Value(roomId),
                  Class('bg-transparent px-0 py-2 outline-none w-full'),
                  OnInput(value => toMessage(ChangedRoomId({ value }))),
                  OnBlur(toMessage(BlurredRoomIdInput())),
                  Autocapitalize('none'),
                  Spellcheck(false),
                  Autocorrect('off'),
                  Autocomplete('off'),
                ]),
              ],
            ),
          ],
        ),
      ],
    )

const maybeErrorMessage = (maybeRoomFormError: Option.Option<string>) =>
  Option.match(maybeRoomFormError, {
    onNone: () => empty,
    onSome: errorMessage =>
      div(
        [Class('mt-6')],
        [
          span([Class('text-terminal-red uppercase')], ['[Error] ']),
          span([Class('text-terminal-red')], [errorMessage]),
        ],
      ),
  })
