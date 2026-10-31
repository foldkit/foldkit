import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  String,
  pipe,
} from 'effect'
import { Block, Command, Dom } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import * as Shared from '@typing-game/shared'

import { RoomsClient } from '../services'

const USERNAME_INPUT_ID = 'username'
const ROOM_ID_INPUT_ID = 'roomId'
const USERNAME_MAX_LENGTH = 24
const EXIT_ROOM_ID = 'exit'

// MODEL

const HomeAction = Schema.Literals(['CreateRoom', 'JoinRoom', 'ChangeUsername'])
type HomeAction = typeof HomeAction.Type

const HOME_ACTIONS: ReadonlyArray<HomeAction> = HomeAction.literals

export const HomeStep = defineTaggedUnion({
  EnterUsername: { username: Schema.String },
  SelectAction: { username: Schema.String, selectedAction: HomeAction },
  EnterRoomId: { username: Schema.String, roomId: Schema.String },
})
export type HomeStep = typeof HomeStep.Type
type SelectActionHomeStep = typeof HomeStep.SelectAction.Type

const Model = Schema.Struct({
  homeStep: HomeStep,
  formError: Schema.Option(Schema.String),
})
type Model = typeof Model.Type

export const homeCapturesKeyboard = (model: Model): boolean =>
  HomeStep.guards.SelectAction(model.homeStep)

// MESSAGE

const Message = defineMessageUnion({
  CompletedFocusUsernameInput: {},
  CompletedFocusRoomIdInput: {},
  SubmittedUsernameForm: {},
  ChangedUsername: { value: Schema.String },
  BlurredUsernameInput: {},
  ChangedRoomId: { value: Schema.String },
  BlurredRoomIdInput: {},
  SubmittedJoinRoomForm: {},
  SucceededCreateRoom: { roomId: Schema.String, player: Shared.Player },
  SucceededJoinRoomFromHome: { roomId: Schema.String, player: Shared.Player },
  FailedCreateRoom: { error: Schema.String },
  FailedJoinRoomFromHome: { error: Schema.String },
  PressedKey: { key: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  CreatedRoom: { roomId: Schema.String, player: Shared.Player },
  JoinedRoom: { roomId: Schema.String, player: Shared.Player },
})

// COMMAND

export const CreateRoom = Command.define('CreateRoom', {
  args: { username: Schema.String },
  messages: [Message.SucceededCreateRoom, Message.FailedCreateRoom],
})

export const JoinRoomFromHome = Command.define('JoinRoomFromHome', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoomFromHome, Message.FailedJoinRoomFromHome],
})

export const FocusUsernameInput = Command.define('FocusUsernameInput', {
  messages: [Message.CompletedFocusUsernameInput],
})

export const FocusRoomIdInput = Command.define('FocusRoomIdInput', {
  messages: [Message.CompletedFocusRoomIdInput],
})

export class Home extends Block<Home>()('Home', {
  Model,
  Message,
  OutMessage,
  Command: [CreateRoom, JoinRoomFromHome, FocusUsernameInput, FocusRoomIdInput],
}) {}

// LIVE

export const HomeLive = Home.make(
  Effect.fn(function* () {
    const client = yield* RoomsClient

    return {
      model: {
        homeStep: HomeStep.EnterUsername({ username: '' }),
        formError: Option.none(),
      },

      start: [FocusUsernameInput()],

      update: {
        CompletedFocusUsernameInput: model => ({ model }),
        CompletedFocusRoomIdInput: model => ({ model }),
        SubmittedUsernameForm: submittedUsernameFormStep,
        PressedKey: (model, { key }) => pressedKeyStep(model, key),
        ChangedUsername: (model, { value }) =>
          changedUsernameStep(model, value),
        BlurredUsernameInput: model => ({
          model,
          commands: [FocusUsernameInput()],
        }),
        BlurredRoomIdInput: model => ({
          model,
          commands: [FocusRoomIdInput()],
        }),
        ChangedRoomId: (model, { value }) => changedRoomIdStep(model, value),
        SubmittedJoinRoomForm: submittedJoinRoomFormStep,
        SucceededCreateRoom: (model, { roomId, player }) => ({
          model,
          outMessage: OutMessage.CreatedRoom({ roomId, player }),
        }),
        SucceededJoinRoomFromHome: (model, { roomId, player }) => ({
          model,
          outMessage: OutMessage.JoinedRoom({ roomId, player }),
        }),
        FailedCreateRoom: (model, { error }) => ({
          model: modifyFields(model, { formError: () => Option.some(error) }),
        }),
        FailedJoinRoomFromHome: (model, { error }) => ({
          model: modifyFields(model, { formError: () => Option.some(error) }),
        }),
      },

      commands: {
        CreateRoom: ({ username }) =>
          client.createRoom({ username }).pipe(
            Effect.map(({ player, room }) =>
              Message.SucceededCreateRoom({ roomId: room.id, player }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedCreateRoom({ error: globalThis.String(error) }),
              ),
            ),
          ),
        JoinRoomFromHome: ({ username, roomId }) =>
          client.joinRoom({ username, roomId }).pipe(
            Effect.map(({ player, room }) =>
              Message.SucceededJoinRoomFromHome({ roomId: room.id, player }),
            ),
            Effect.catch(error =>
              Effect.succeed(
                Message.FailedJoinRoomFromHome({
                  error: globalThis.String(error),
                }),
              ),
            ),
          ),
        FocusUsernameInput: () =>
          Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusUsernameInput()),
          ),
        FocusRoomIdInput: () =>
          Dom.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedFocusRoomIdInput()),
          ),
      },

      view,
    }
  }),
)

// UPDATE

const cycleAction =
  (toNextIndex: (index: number) => number) =>
  (selectedAction: HomeAction): HomeAction => {
    const actionCount = Array.length(HOME_ACTIONS)

    return pipe(
      HOME_ACTIONS,
      Array.findFirstIndex(action => action === selectedAction),
      Option.flatMap(index =>
        Array.get(
          HOME_ACTIONS,
          (toNextIndex(index) + actionCount) % actionCount,
        ),
      ),
      Option.getOrElse(() => selectedAction),
    )
  }

const moveSelectionStep =
  (toNextIndex: (index: number) => number) =>
  (model: Model, { username, selectedAction }: SelectActionHomeStep) => ({
    model: modifyFields(model, {
      homeStep: () =>
        HomeStep.SelectAction({
          username,
          selectedAction: cycleAction(toNextIndex)(selectedAction),
        }),
    }),
  })

const confirmSelectionStep = (
  model: Model,
  { username, selectedAction }: SelectActionHomeStep,
) =>
  Match.value(selectedAction).pipe(
    Match.when('CreateRoom', () => ({
      model,
      commands: [CreateRoom({ username })],
    })),
    Match.when('JoinRoom', () => ({
      model: modifyFields(model, {
        homeStep: () => HomeStep.EnterRoomId({ username, roomId: '' }),
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

const pressedKeyStep = (model: Model, key: string) =>
  HomeStep.matchOrElse(
    model.homeStep,
    {
      SelectAction: selectAction =>
        Match.value(key).pipe(
          Match.when('ArrowUp', () =>
            moveSelectionStep(Number.decrement)(model, selectAction),
          ),
          Match.when('ArrowDown', () =>
            moveSelectionStep(Number.increment)(model, selectAction),
          ),
          Match.when('Enter', () => confirmSelectionStep(model, selectAction)),
          Match.orElse(() => ({ model })),
        ),
    },
    () => ({ model }),
  )

const submittedUsernameFormStep = (model: Model) =>
  HomeStep.matchOrElse(
    model.homeStep,
    {
      EnterUsername: ({ username }) => {
        if (String.isNonEmpty(username)) {
          return {
            model: modifyFields(model, {
              homeStep: () =>
                HomeStep.SelectAction({
                  username,
                  selectedAction: 'CreateRoom',
                }),
            }),
          }
        } else {
          return { model }
        }
      },
    },
    () => ({ model }),
  )

const changedUsernameStep = (model: Model, value: string) =>
  HomeStep.matchOrElse(
    model.homeStep,
    {
      EnterUsername: () => ({
        model: modifyFields(model, {
          homeStep: () => HomeStep.EnterUsername({ username: value }),
          formError: () => Option.none(),
        }),
      }),
    },
    () => ({ model }),
  )

const changedRoomIdStep = (model: Model, value: string) =>
  HomeStep.matchOrElse(
    model.homeStep,
    {
      EnterRoomId: ({ username }) => ({
        model: modifyFields(model, {
          homeStep: () => HomeStep.EnterRoomId({ username, roomId: value }),
          formError: () => Option.none(),
        }),
      }),
    },
    () => ({ model }),
  )

const submittedJoinRoomFormStep = (model: Model) =>
  HomeStep.matchOrElse(
    model.homeStep,
    {
      EnterRoomId: ({ username, roomId }) => {
        if (roomId === EXIT_ROOM_ID) {
          return {
            model: modifyFields(model, {
              homeStep: () =>
                HomeStep.SelectAction({
                  username,
                  selectedAction: 'JoinRoom',
                }),
            }),
          }
        } else {
          return {
            model,
            commands: Array.filter(
              [JoinRoomFromHome({ username, roomId })],
              () => String.isNonEmpty(roomId),
            ),
          }
        }
      },
    },
    () => ({ model }),
  )

// VIEW

type HomeViewBuilder = HtmlBuilder<Message>

const homeActionToLabel = (homeAction: HomeAction): string =>
  Match.value(homeAction).pipe(
    Match.when('CreateRoom', () => 'Create room'),
    Match.when('JoinRoom', () => 'Join room'),
    Match.when('ChangeUsername', () => 'Change username'),
    Match.exhaustive,
  )

const enterUsernameView = (username: string, h: HomeViewBuilder): Html =>
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
              // NOTE: Safari ignores fields named "search" for password autofill.
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
                h.Maxlength(USERNAME_MAX_LENGTH),
              ]),
            ],
          ),
        ],
      ),
    ],
  )

const selectActionView = (
  selectedAction: HomeAction,
  h: HomeViewBuilder,
): Html =>
  h.div(
    [h.Class('space-y-4')],
    [
      ...Array.map(HOME_ACTIONS, homeAction =>
        h.div(
          [h.Class('whitespace-pre-wrap')],
          [
            selectedAction === homeAction ? '> ' : '  ',
            homeActionToLabel(homeAction),
          ],
        ),
      ),
      h.div(
        [h.Class('text-terminal-green mt-8')],
        ['(↑↓ to navigate, Enter to select)'],
      ),
    ],
  )

const enterRoomIdView = (roomId: string, h: HomeViewBuilder): Html =>
  h.form(
    [h.OnSubmit(Message.SubmittedJoinRoomForm())],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.label(
            [h.For(ROOM_ID_INPUT_ID)],
            [`Enter room ID (or "${EXIT_ROOM_ID}" to go back): `],
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

const formErrorView = (
  maybeFormError: Option.Option<string>,
  h: HomeViewBuilder,
): Html =>
  Option.match(maybeFormError, {
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

const view = (model: Model, h: HomeViewBuilder): Html => {
  const welcomeText = HomeStep.match(model.homeStep, {
    EnterUsername: () => h.empty,
    SelectAction: ({ username }) =>
      h.h2([h.Class('mb-6')], [`Welcome, ${username}!`]),
    EnterRoomId: ({ username }) =>
      h.h2([h.Class('mb-6')], [`Welcome, ${username}!`]),
  })

  return h.div(
    [h.Class('max-w-4xl')],
    [
      h.h1([h.Class('mb-6 uppercase')], ['Typing Terminal']),
      welcomeText,
      HomeStep.match(model.homeStep, {
        EnterUsername: ({ username }) => enterUsernameView(username, h),
        SelectAction: ({ selectedAction }) =>
          selectActionView(selectedAction, h),
        EnterRoomId: ({ roomId }) => enterRoomIdView(roomId, h),
      }),
      formErrorView(model.formError, h),
    ],
  )
}
