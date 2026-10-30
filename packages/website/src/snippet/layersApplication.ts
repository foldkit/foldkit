import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { ApiClient, User } from './layers'

const UserState = defineTaggedUnion({
  Loading: {},
  Loaded: { user: User },
  Failed: { error: Schema.String },
})

const Message = defineMessageUnion({
  SucceededLoadUser: { user: User },
  FailedLoadUser: { error: Schema.String },
})

export const LoadUser = Command.define('LoadUser', {
  args: { userId: Schema.String },
  messages: [Message.SucceededLoadUser, Message.FailedLoadUser],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ user: UserState }),
  Message,
  Command: [LoadUser],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const apiClient = yield* ApiClient

    return {
      model: { user: UserState.Loading() },
      start: [LoadUser({ userId: 'user-1' })],

      update: {
        SucceededLoadUser: (model, { user }) => ({
          model: modifyFields(model, {
            user: () => UserState.Loaded({ user }),
          }),
        }),
        FailedLoadUser: (model, { error }) => ({
          model: modifyFields(model, {
            user: () => UserState.Failed({ error }),
          }),
        }),
      },

      commands: {
        LoadUser: ({ userId }) =>
          apiClient.getUser(userId).pipe(
            Effect.map(user => Message.SucceededLoadUser({ user })),
            Effect.catch(() =>
              Effect.succeed(
                Message.FailedLoadUser({ error: 'Request failed' }),
              ),
            ),
          ),
      },

      view: (model, h) => ({
        title: 'User profile',
        body: UserState.match(model.user, {
          Loading: () => h.p([], ['Loading user…']),
          Loaded: ({ user }) => h.p([], [user.name]),
          Failed: ({ error }) => h.p([h.Role('alert')], [error]),
        }),
      }),
    }
  }),
)
