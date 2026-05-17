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

export const view = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Id('app')],
    [
      M.value(model.status).pipe(
        M.withReturnType<Html>(),
        M.when('Submitting', () =>
          h.form(
            [h.Class('login-form'), h.Disabled(true)],
            [h.button([h.Type('submit'), h.Disabled(true)], ['Signing in...'])],
          ),
        ),
        M.when('LoggedIn', () =>
          h.div(
            [
              h.Class('logged-in'),
              h.Role('region'),
              h.AriaLabel('User session'),
            ],
            [
              h.span(
                [h.Class('greeting'), h.Role('status')],
                [`Welcome, ${model.username}!`],
              ),
              h.button(
                [
                  h.OnClick(ClickedLogout()),
                  h.Role('button'),
                  h.AriaExpanded(false),
                ],
                ['Log out'],
              ),
            ],
          ),
        ),
        M.when('Error', () =>
          h.div(
            [],
            [
              h.p([h.Class('error'), h.Role('alert')], [model.error]),
              h.button(
                [h.OnClick(SubmittedLogin()), h.Class('retry')],
                ['Retry'],
              ),
            ],
          ),
        ),
        M.when('Idle', () =>
          h.form(
            [h.OnSubmit(SubmittedLogin()), h.Class('login-form')],
            [
              h.label([h.For('email'), h.Class('sr-only')], ['Email']),
              h.input([
                h.Id('email'),
                h.Type('email'),
                h.Placeholder('Email'),
                h.Value(model.email),
                h.OnInput(value => UpdatedEmail({ value })),
              ]),
              h.label([h.For('password'), h.Class('sr-only')], ['Password']),
              h.input([
                h.Id('password'),
                h.Type('password'),
                h.Placeholder('Password'),
                h.Value(model.password),
                h.OnInput(value => UpdatedPassword({ value })),
              ]),
              h.button(
                [h.Type('submit'), h.Class('primary'), h.Disabled(false)],
                ['Sign in'],
              ),
            ],
          ),
        ),
        M.exhaustive,
      ),
    ],
  )
}
