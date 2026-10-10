import { Effect, Schema } from 'effect'
import { AsyncData, Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Api, ApiLayer } from './api'

// MODEL

// Remote state is a value in the Model. AsyncData is the shipped six-state
// union, so there is no hand-rolled loading/failure/stale union to maintain.
const UserAsyncData = AsyncData.Schema(User, ApiError)

export const Model = Schema.Struct({
  user: UserAsyncData.schema,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedLoadUser: {},
  SucceededLoadUser: { user: User },
  FailedLoadUser: { error: ApiError },
})
type Message = typeof Message.Type

// COMMAND

// Api is an Effect service; ApiLayer provides it.
const FetchUser = Command.define('FetchUser', {
  messages: [Message.SucceededLoadUser, Message.FailedLoadUser],
})

const FetchUserLayer = FetchUser.toLayer(
  Effect.gen(function* () {
    const api = yield* Api

    return () =>
      api.getUser().pipe(
        Effect.map(user => Message.SucceededLoadUser({ user })),
        Effect.catch(error =>
          Effect.succeed(Message.FailedLoadUser({ error })),
        ),
      )
  }),
)

export const EffectsLayer = FetchUserLayer
export const ServicesLayer = ApiLayer

// UPDATE

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedLoadUser: () => ({
      model: modifyFields(model, { user: () => UserAsyncData.Loading() }),
      commands: [FetchUser()],
    }),
    SucceededLoadUser: ({ user }) => ({
      model: modifyFields(model, {
        user: () => UserAsyncData.Success({ data: user }),
      }),
    }),
    FailedLoadUser: ({ error }) => ({
      model: modifyFields(model, {
        user: () => UserAsyncData.Failure({ error }),
      }),
    }),
  }),
)
