import { Effect, Match as M, Schema as S } from 'effect'
import { AsyncData, Command } from 'foldkit'
import { m } from 'foldkit/message'

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

const ClickedLoadUser = m('ClickedLoadUser')
const SucceededLoadUser = m('SucceededLoadUser', { user: User })
const FailedLoadUser = m('FailedLoadUser', { error: ApiError })

const Message = S.Union([ClickedLoadUser, SucceededLoadUser, FailedLoadUser])
type Message = typeof Message.Type

// COMMAND

// Api is an Effect service; Api.Default is its layer.
const FetchUser = Command.define(
  'FetchUser',
  SucceededLoadUser,
  FailedLoadUser,
)(
  Effect.gen(function* () {
    const api = yield* Api
    const user = yield* api.getUser()
    return SucceededLoadUser({ user })
  }).pipe(
    Effect.catch(error => Effect.succeed(FailedLoadUser({ error }))),
    Effect.provide(Api.Default),
  ),
)

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedLoadUser: () => [
        evo(model, { user: () => UserAsyncData.Loading() }),
        [FetchUser()],
      ],
      SucceededLoadUser: ({ user }) => [
        evo(model, { user: () => UserAsyncData.Success({ data: user }) }),
        [],
      ],
      FailedLoadUser: ({ error }) => [
        evo(model, { user: () => UserAsyncData.Failure({ error }) }),
        [],
      ],
    }),
  )
