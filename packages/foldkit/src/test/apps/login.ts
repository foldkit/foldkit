import { Effect, Match as M, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import { type Html, html } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

export const Model = S.Struct({
  email: S.String,
  password: S.String,
  status: S.Literals(['Idle', 'Submitting', 'LoggedIn', 'Error']),
  username: S.String,
  error: S.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const UpdatedEmail = m('UpdatedEmail', { value: S.String })
export const UpdatedPassword = m('UpdatedPassword', { value: S.String })
export const SubmittedLogin = m('SubmittedLogin')
export const SucceededAuthenticate = m('SucceededAuthenticate', {
  username: S.String,
})
export const FailedAuthenticate = m('FailedAuthenticate', { error: S.String })
export const ClickedLogout = m('ClickedLogout')

export const Message = S.Union([
  UpdatedEmail,
  UpdatedPassword,
  SubmittedLogin,
  SucceededAuthenticate,
  FailedAuthenticate,
  ClickedLogout,
])
export type Message = typeof Message.Type

// COMMAND

export const Authenticate = Command.define(
  'Authenticate',
  SucceededAuthenticate,
  FailedAuthenticate,
)(Effect.sync(() => SucceededAuthenticate({ username: 'alice' })))

// INIT

export const initialModel: Model = {
  email: '',
  password: '',
  status: 'Idle',
  username: '',
  error: '',
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      UpdatedEmail: ({ value }) => [{ ...model, email: value }, []],
      UpdatedPassword: ({ value }) => [{ ...model, password: value }, []],
      SubmittedLogin: () => [
        { ...model, status: 'Submitting' },
        [Authenticate()],
      ],
      SucceededAuthenticate: ({ username }) => [
        { ...model, status: 'LoggedIn', username },
        [],
      ],
      FailedAuthenticate: ({ error }) => [
        { ...model, status: 'Error', error },
        [],
      ],
      ClickedLogout: () => [
        { ...model, status: 'Idle', username: '', email: '', password: '' },
        [],
      ],
    }),
  )

// VIEW

const {
  div,
  form,
  input,
  button,
  span,
  label,
  p,
  OnInput,
  OnSubmit,
  OnClick,
  Id,
  For,
  Class,
  Type,
  Value,
  Placeholder,
  Role,
  AriaExpanded,
  AriaLabel,
  Disabled,
} = html<Message>()

export const view = (model: Model): Html =>
  div(
    [Id('app')],
    [
      M.value(model.status).pipe(
        M.withReturnType<Html>(),
        M.when('Submitting', () =>
          form(
            [Class('login-form'), Disabled(true)],
            [button([Type('submit'), Disabled(true)], ['Signing in...'])],
          ),
        ),
        M.when('LoggedIn', () =>
          div(
            [Class('logged-in'), Role('region'), AriaLabel('User session')],
            [
              span(
                [Class('greeting'), Role('status')],
                [`Welcome, ${model.username}!`],
              ),
              button(
                [OnClick(ClickedLogout()), Role('button'), AriaExpanded(false)],
                ['Log out'],
              ),
            ],
          ),
        ),
        M.when('Error', () =>
          div(
            [],
            [
              p([Class('error'), Role('alert')], [model.error]),
              button([OnClick(SubmittedLogin()), Class('retry')], ['Retry']),
            ],
          ),
        ),
        M.when('Idle', () =>
          form(
            [OnSubmit(SubmittedLogin()), Class('login-form')],
            [
              label([For('email'), Class('sr-only')], ['Email']),
              input([
                Id('email'),
                Type('email'),
                Placeholder('Email'),
                Value(model.email),
                OnInput(value => UpdatedEmail({ value })),
              ]),
              label([For('password'), Class('sr-only')], ['Password']),
              input([
                Id('password'),
                Type('password'),
                Placeholder('Password'),
                Value(model.password),
                OnInput(value => UpdatedPassword({ value })),
              ]),
              button(
                [Type('submit'), Class('primary'), Disabled(false)],
                ['Sign in'],
              ),
            ],
          ),
        ),
        M.exhaustive,
      ),
    ],
  )
