import { Effect, Schema as S } from 'effect'
import { AsyncData, Command, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Api } from './api'

// MODEL

// Remote state is a value in the Model. AsyncData is the shipped six-state
// union, so there is no hand-rolled loading/failure/stale union to maintain.
const UserAsyncData = AsyncData.Schema(User, ApiError)

export const Model = S.Struct({
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

// Api is an Effect service; Api.Default is its layer.
const FetchUser = Command.define('FetchUser', {
  messages: [Message.SucceededLoadUser, Message.FailedLoadUser],
  execute: Effect.gen(function* () {
    const api = yield* Api
    const user = yield* api.getUser()
    return Message.SucceededLoadUser({ user })
  }).pipe(
    Effect.catch(error => Effect.succeed(Message.FailedLoadUser({ error }))),
    Effect.provide(Api.Default),
  ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLoadUser: () => ({
      model: evo(model, { user: () => UserAsyncData.Loading() }),
      commands: [FetchUser()],
    }),
    SucceededLoadUser: ({ user }) => ({
      model: evo(model, { user: () => UserAsyncData.Success({ data: user }) }),
    }),
    FailedLoadUser: ({ error }) => ({
      model: evo(model, { user: () => UserAsyncData.Failure({ error }) }),
    }),
  })
