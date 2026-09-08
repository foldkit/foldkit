import { Array, Option } from 'effect'
import { Submodel } from 'foldkit'
import { Html, HtmlBuilder } from 'foldkit/html'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import { Message } from './message'
import {
  HOME_ACTIONS,
  HomeAction,
  HomeStep,
  Model,
  homeActionToLabel,
} from './model'

export const view = Submodel.defineView<Model, Message>((model, h): Html => {
  const maybeUsername = HomeStep.match(model.homeStep, {
    EnterUsername: () => Option.none(),
    SelectAction: ({ username }) => Option.some(username),
    EnterRoomId: ({ username }) => Option.some(username),
  })

  const welcomeText = Option.match(maybeUsername, {
    onNone: () => h.empty,
    onSome: username => h.h2([h.Class('mb-6')], [`Welcome, ${username}!`]),
  })

  return h.div(
    [h.Class('max-w-4xl')],
    [
      h.h1([h.Class('mb-6 uppercase')], ['Typing Terminal']),
      welcomeText,

      HomeStep.match(model.homeStep, {
        EnterUsername: step => enterUsername(step, h),
        SelectAction: step => selectAction(step, h),
        EnterRoomId: step => enterRoomId(step, h),
      }),

      maybeErrorMessage(model.formError, h),
    ],
  )
})

const enterUsername = (
  { username }: typeof HomeStep.EnterUsername.Type,
  h: HtmlBuilder<Message>,
): Html =>
  h.form(
    [h.OnSubmit(Message.SubmittedUsernameForm())],
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
                h.OnInput(value => Message.ChangedUsername({ value })),
                h.OnBlur(Message.BlurredUsernameInput()),
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

const selectAction = (
  { selectedAction }: typeof HomeStep.SelectAction.Type,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('space-y-4')],
    [
      ...Array.map(HOME_ACTIONS, action(selectedAction, h)),
      h.div(
        [h.Class('text-terminal-green mt-8')],
        ['(↑↓ to navigate, Enter to select)'],
      ),
    ],
  )

const action =
  (selectedAction: HomeAction, h: HtmlBuilder<Message>) =>
  (homeAction: HomeAction): Html =>
    h.div(
      [h.Class('whitespace-pre-wrap')],
      [
        selectedAction === homeAction ? '> ' : '  ',
        homeActionToLabel(homeAction),
      ],
    )

const enterRoomId = (
  { roomId }: typeof HomeStep.EnterRoomId.Type,
  h: HtmlBuilder<Message>,
): Html =>
  h.form(
    [h.OnSubmit(Message.SubmittedJoinRoomForm())],
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
                h.OnInput(value => Message.ChangedRoomId({ value })),
                h.OnBlur(Message.BlurredRoomIdInput()),
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

const maybeErrorMessage = (
  maybeRoomFormError: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeRoomFormError, {
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
