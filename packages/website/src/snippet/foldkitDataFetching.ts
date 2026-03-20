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

// MODEL - Your entire application state

const Model = S.Struct({
  userId: S.String,
  user: UserState,
})
type Model = typeof Model.Type

// MESSAGE - Events that can happen in your app

const ClickedFetchUser = m('ClickedFetchUser', { userId: S.String })
const SucceededFetchUser = m('SucceededFetchUser', {
  data: UserSchema,
})
const FailedFetchUser = m('FailedFetchUser', { error: S.String })

const Message = S.Union(ClickedFetchUser, SucceededFetchUser, FailedFetchUser)
type Message = typeof Message.Type

// COMMAND - Descriptions of side effects that resolve to Messages

const fetchUser = (
  userId: string,
): Command.Command<typeof SucceededFetchUser | typeof FailedFetchUser> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise(() =>
      fetch(`/api/users/${userId}`).then(response => response.json()),
    )
    // Validate the response against UserSchema at runtime
    const data = yield* S.decodeUnknown(UserSchema)(response)
    return SucceededFetchUser({ data })
  }).pipe(
    // Every Command must return a Message — no errors bubble up
    Effect.catchAll(error =>
      Effect.succeed(FailedFetchUser({ error: String(error) })),
    ),
    Command.make('FetchUser'),
  )

// UPDATE - How Messages change the Model

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
    // Handle every Message — the type system ensures all cases are covered
    M.tagsExhaustive({
      ClickedFetchUser: ({ userId }) => [
        // evo returns an updated copy of Model
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
