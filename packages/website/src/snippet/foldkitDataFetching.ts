import { Effect, Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const UserSchema = S.Struct({ id: S.String, name: S.String })

const UserLoading = ts('UserLoading')
const UserSuccess = ts('UserSuccess', { data: UserSchema })
const UserFailure = ts('UserFailure', { error: S.String })
const UserState = S.Union(UserLoading, UserSuccess, UserFailure)

// MODEL

const Model = S.Struct({
  userId: S.String,
  user: UserState,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedFetchUser = m('ClickedFetchUser', { userId: S.String })
const SucceededFetchUser = m('SucceededFetchUser', {
  data: UserSchema,
})
const FailedFetchUser = m('FailedFetchUser', { error: S.String })

const Message = S.Union(ClickedFetchUser, SucceededFetchUser, FailedFetchUser)
type Message = typeof Message.Type

// COMMAND

const FetchUser = Command.define(
  'FetchUser',
  SucceededFetchUser,
  FailedFetchUser,
)

const fetchUser = (userId: string) =>
  FetchUser(
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise(() =>
        fetch(`/api/users/${userId}`).then(response => response.json()),
      )
      const data = yield* S.decodeUnknown(UserSchema)(response)
      return SucceededFetchUser({ data })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(FailedFetchUser({ error: String(error) })),
      ),
    ),
  )

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ClickedFetchUser: ({ userId }) => [
        evo(model, { user: () => UserLoading() }),
        [fetchUser(userId)],
      ],
      SucceededFetchUser: ({ data }) => [
        evo(model, { user: () => UserSuccess({ data }) }),
        [],
      ],
      FailedFetchUser: ({ error }) => [
        evo(model, { user: () => UserFailure({ error }) }),
        [],
      ],
    }),
  )
