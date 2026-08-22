import { Effect, Match as M, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

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

export const Message = defineMessageUnion({
  UpdatedEmail: { value: S.String },
  UpdatedPassword: { value: S.String },
  SubmittedLogin: {},
  SucceededAuthenticate: { username: S.String },
  FailedAuthenticate: { error: S.String },
  ClickedLogout: {},
})

export type Message = typeof Message.Type

// COMMAND

export const Authenticate = Command.define('Authenticate', {
  messages: [Message.SucceededAuthenticate, Message.FailedAuthenticate],
  execute: Effect.sync(() =>
    Message.SucceededAuthenticate({ username: 'alice' }),
  ),
})

// INIT

export const initialModel: Model = {
  email: '',
  password: '',
  status: 'Idle',
  username: '',
  error: '',
}

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedEmail: ({ value }) => ({ model: { ...model, email: value } }),
    UpdatedPassword: ({ value }) => ({ model: { ...model, password: value } }),
    SubmittedLogin: () => ({
      model: { ...model, status: 'Submitting' },
      commands: [Authenticate()],
    }),
    SucceededAuthenticate: ({ username }) => ({
      model: { ...model, status: 'LoggedIn', username },
    }),
    FailedAuthenticate: ({ error }) => ({
      model: { ...model, status: 'Error', error },
    }),
    ClickedLogout: () => ({
      model: {
        ...model,
        status: 'Idle',
        username: '',
        email: '',
        password: '',
      },
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Id('app')],
    [
      M.value(model.status).pipe(
        M.withReturnType<Html>(),
        M.when('Submitting', () =>
          h.form(
            [h.Class('login-form')],
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
                  h.OnClick(Message.ClickedLogout()),
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
                [h.OnClick(Message.SubmittedLogin()), h.Class('retry')],
                ['Retry'],
              ),
            ],
          ),
        ),
        M.when('Idle', () =>
          h.form(
            [h.OnSubmit(Message.SubmittedLogin()), h.Class('login-form')],
            [
              h.label([h.For('email'), h.Class('sr-only')], ['Email']),
              h.input([
                h.Id('email'),
                h.Type('email'),
                h.Placeholder('Email'),
                h.Value(model.email),
                h.OnInput(value => Message.UpdatedEmail({ value })),
              ]),
              h.label([h.For('password'), h.Class('sr-only')], ['Password']),
              h.input([
                h.Id('password'),
                h.Type('password'),
                h.Placeholder('Password'),
                h.Value(model.password),
                h.OnInput(value => Message.UpdatedPassword({ value })),
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
