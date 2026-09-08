import { Effect, Schema } from 'effect'
import { Command, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String })

const UserState = defineTaggedUnion({
  Loading: {},
  Success: { data: UserSchema },
  Failure: { error: Schema.String },
})

// MODEL

const Model = Schema.Struct({
  userId: Schema.String,
  user: UserState,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedFetchUser: { userId: Schema.String },
  SucceededFetchUser: { data: UserSchema },
  FailedFetchUser: { error: Schema.String },
})
type Message = typeof Message.Type

// COMMAND

const FetchUser = Command.define('FetchUser', {
  args: { userId: Schema.String },
  messages: [Message.SucceededFetchUser, Message.FailedFetchUser],
  execute: ({ userId }) =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise(() =>
        fetch(`/api/users/${userId}`).then(response => response.json()),
      )
      const data = yield* Schema.decodeUnknownEffect(UserSchema)(response)
      return Message.SucceededFetchUser({ data })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(Message.FailedFetchUser({ error: String(error) })),
      ),
    ),
})

// UPDATE

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedFetchUser: ({ userId }) => ({
      model: evo(model, { user: () => UserState.Loading() }),
      commands: [FetchUser({ userId })],
    }),
    SucceededFetchUser: ({ data }) => ({
      model: evo(model, { user: () => UserState.Success({ data }) }),
    }),
    FailedFetchUser: ({ error }) => ({
      model: evo(model, { user: () => UserState.Failure({ error }) }),
    }),
  })
