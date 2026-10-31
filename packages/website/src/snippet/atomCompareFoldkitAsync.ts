import { Context, Effect, Schema } from 'effect'
import { AsyncData, Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const User = Schema.Struct({ id: Schema.String, name: Schema.String })
export type User = typeof User.Type

export const ApiError = Schema.Struct({ reason: Schema.String })
export type ApiError = typeof ApiError.Type

export class Api extends Context.Service<
  Api,
  Readonly<{ getUser: () => Effect.Effect<User, ApiError> }>
>()('Api') {}

// Remote state is a value in the Model. AsyncData is the shipped six-state
// union, so there is no hand-rolled loading/failure/stale union to maintain.
const UserAsyncData = AsyncData.Schema(User, ApiError)

const Model = Schema.Struct({
  user: UserAsyncData.schema,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedLoadUser: {},
  SucceededLoadUser: { user: User },
  FailedLoadUser: { error: ApiError },
})
type Message = typeof Message.Type

export const FetchUser = Command.define('FetchUser', {
  messages: [Message.SucceededLoadUser, Message.FailedLoadUser],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [FetchUser],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    const api = yield* Api

    return {
      model: { user: UserAsyncData.Idle() },

      update: {
        ClickedLoadUser: model => ({
          model: modifyFields(model, { user: () => UserAsyncData.Loading() }),
          commands: [FetchUser()],
        }),
        SucceededLoadUser: (model, { user }) => ({
          model: modifyFields(model, {
            user: () => UserAsyncData.Success({ data: user }),
          }),
        }),
        FailedLoadUser: (model, { error }) => ({
          model: modifyFields(model, {
            user: () => UserAsyncData.Failure({ error }),
          }),
        }),
      },

      commands: {
        FetchUser: () =>
          api.getUser().pipe(
            Effect.map(user => Message.SucceededLoadUser({ user })),
            Effect.catch(error =>
              Effect.succeed(Message.FailedLoadUser({ error })),
            ),
          ),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedLoadUser())], ['Load user']),
            AsyncData.match(model.user, {
              onIdle: () => h.p([], ['No user loaded']),
              onLoading: () => h.p([], ['Loading…']),
              onRefreshing: user => h.article([], [user.name]),
              onFailure: error => h.p([], [error.reason]),
              onStale: ({ data }) => h.article([], [data.name]),
              onSuccess: user => h.article([], [user.name]),
            }),
          ],
        ),
    }
  }),
)
