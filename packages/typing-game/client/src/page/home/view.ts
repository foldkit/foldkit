import { Array, Match as M, Option } from 'effect'
import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import {
  BlurredRoomIdInput,
  BlurredUsernameInput,
  ChangedRoomId,
  ChangedUsername,
  SubmittedJoinRoomForm,
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

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

  const maybeUsername = M.value(model.homeStep).pipe(
    M.tagsExhaustive({
      EnterUsername: () => Option.none(),
      SelectAction: ({ username }) => Option.some(username),
      EnterRoomId: ({ username }) => Option.some(username),
    }),
  )

  const welcomeText = Option.match(maybeUsername, {
    onNone: () => h.empty,
    onSome: username => h.h2([h.Class('mb-6')], [`Welcome, ${username}!`]),
  })

  return h.div(
    [h.Class('max-w-4xl')],
    [
      h.h1([h.Class('mb-6 uppercase')], ['Typing Terminal']),
      welcomeText,

      h.keyed('div')(
        model.homeStep._tag,
        [],
        [
          M.value(model.homeStep).pipe(
            M.tagsExhaustive({
              EnterUsername: enterUsername,
              SelectAction: selectAction,
              EnterRoomId: enterRoomId,
            }),
          ),
        ],
      ),

      maybeErrorMessage(model.formError),
    ],
  )
})

const enterUsername = ({ username }: EnterUsername): Html => {
  const h = html<Message>()

  return h.form(
    [h.OnSubmit(SubmittedUsernameForm())],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.label([h.For(USERNAME_INPUT_ID)], ['Enter username: ']),
          h.div(
            [h.Class('flex items-center gap-2 flex-1')],
            [
              // Safari ignores fields named "search" for password autofill
              h.input([
                h.Id(USERNAME_INPUT_ID),
                h.Name('search'),
                h.Type('text'),
                h.Value(username),
                h.Class('bg-transparent px-0 py-2 outline-none w-full'),
                h.OnInput(value => ChangedUsername({ value })),
                h.OnBlur(BlurredUsernameInput()),
                h.Autocapitalize('none'),
                h.Spellcheck(false),
                h.Autocorrect('off'),
                h.Autocomplete('off'),
                h.Maxlength(24),
              ]),
            ],
          ),
        ],
      ),
    ],
  )
}

const selectAction = ({ selectedAction }: SelectAction): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('space-y-4')],
    [
      ...Array.map(HOME_ACTIONS, action(selectedAction)),
      h.div(
        [h.Class('text-terminal-green mt-8')],
        ['(↑↓ to navigate, Enter to select)'],
      ),
    ],
  )
}

const action =
  (selectedAction: HomeAction) =>
  (homeAction: HomeAction): Html => {
    const h = html<Message>()

    return h.div(
      [h.Class('whitespace-pre-wrap')],
      [
        selectedAction === homeAction ? '> ' : '  ',
        homeActionToLabel(homeAction),
      ],
    )
  }

const enterRoomId = ({ roomId }: EnterRoomId): Html => {
  const h = html<Message>()

  return h.form(
    [h.OnSubmit(SubmittedJoinRoomForm())],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.label(
            [h.For(ROOM_ID_INPUT_ID)],
            ['Enter room ID (or "exit" to go back): '],
          ),
          h.div(
            [h.Class('flex items-center gap-2 flex-1')],
            [
              h.input([
                h.Id(ROOM_ID_INPUT_ID),
                h.Type('text'),
                h.Value(roomId),
                h.Class('bg-transparent px-0 py-2 outline-none w-full'),
                h.OnInput(value => ChangedRoomId({ value })),
                h.OnBlur(BlurredRoomIdInput()),
                h.Autocapitalize('none'),
                h.Spellcheck(false),
                h.Autocorrect('off'),
                h.Autocomplete('off'),
              ]),
            ],
          ),
        ],
      ),
    ],
  )
}

const maybeErrorMessage = (maybeRoomFormError: Option.Option<string>): Html => {
  const h = html<Message>()

  return Option.match(maybeRoomFormError, {
    onNone: () => h.empty,
    onSome: errorMessage =>
      h.div(
        [h.Class('mt-6')],
        [
          h.span([h.Class('text-terminal-red uppercase')], ['[Error] ']),
          h.span([h.Class('text-terminal-red')], [errorMessage]),
        ],
      ),
  })
}
