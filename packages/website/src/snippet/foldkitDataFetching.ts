import { Effect, Schema as S } from 'effect'
import { Command, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const UserSchema = S.Struct({ id: S.String, name: S.String })

const UserLoading = ts('UserLoading')
const UserSuccess = ts('UserSuccess', { data: UserSchema })
const UserFailure = ts('UserFailure', { error: S.String })
const UserState = S.Union([UserLoading, UserSuccess, UserFailure])

// MODEL

const Model = S.Struct({
  userId: S.String,
  user: UserState,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedFetchUser: { userId: S.String },
  SucceededFetchUser: { data: UserSchema },
  FailedFetchUser: { error: S.String },
})
type Message = typeof Message.Type

// COMMAND

const FetchUser = Command.define('FetchUser', {
  args: { userId: S.String },
  messages: [Message.SucceededFetchUser, Message.FailedFetchUser],
  execute: ({ userId }) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise(() =>
        fetch(`/api/users/${userId}`).then(response => response.json()),
      )
      const data = yield* S.decodeUnknownEffect(UserSchema)(response)
      return Message.SucceededFetchUser({ data })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(Message.FailedFetchUser({ error: String(error) })),
      ),
    ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedFetchUser: ({ userId }) => ({
      model: evo(model, { user: () => UserLoading() }),
      commands: [FetchUser({ userId })],
    }),
    SucceededFetchUser: ({ data }) => ({
      model: evo(model, { user: () => UserSuccess({ data }) }),
    }),
    FailedFetchUser: ({ error }) => ({
      model: evo(model, { user: () => UserFailure({ error }) }),
    }),
  })
