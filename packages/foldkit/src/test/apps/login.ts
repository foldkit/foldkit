import { Effect, Match, Schema } from 'effect'

import * as Command from '../../command/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
  status: Schema.Literals(['Idle', 'Submitting', 'LoggedIn', 'Error']),
  username: Schema.String,
  error: Schema.String,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedEmail: { value: Schema.String },
  UpdatedPassword: { value: Schema.String },
  SubmittedLogin: {},
  SucceededAuthenticate: { username: Schema.String },
  FailedAuthenticate: { error: Schema.String },
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

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedEmail: ({ value }) => ({
      model: evo(model, { email: () => value }),
    }),
    UpdatedPassword: ({ value }) => ({
      model: evo(model, { password: () => value }),
    }),
    SubmittedLogin: () => ({
      model: evo(model, { status: () => 'Submitting' }),
      commands: [Authenticate()],
    }),
    SucceededAuthenticate: ({ username }) => ({
      model: evo(model, {
        status: () => 'LoggedIn',
        username: () => username,
      }),
    }),
    FailedAuthenticate: ({ error }) => ({
      model: evo(model, { status: () => 'Error', error: () => error }),
    }),
    ClickedLogout: () => ({
      model: evo(model, {
        status: () => 'Idle',
        username: () => '',
        email: () => '',
        password: () => '',
      }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Id('app')],
    [
      Match.value(model.status).pipe(
        Match.withReturnType<Html>(),
        Match.when('Submitting', () =>
          h.form(
            [h.Class('login-form')],
            [h.button([h.Type('submit'), h.Disabled(true)], ['Signing in...'])],
          ),
        ),
        Match.when('LoggedIn', () =>
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
        Match.when('Error', () =>
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
        Match.when('Idle', () =>
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
        Match.exhaustive,
      ),
    ],
  )
}
