import { Effect, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const UserSchema = Schema.Struct({ id: Schema.String, name: Schema.String })

const UserState = defineTaggedUnion({
  Loading: {},
  Success: { data: UserSchema },
  Failure: { error: Schema.String },
})

const Model = Schema.Struct({
  userId: Schema.String,
  user: UserState,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedFetchUser: { userId: Schema.String },
  SucceededFetchUser: { data: UserSchema },
  FailedFetchUser: { error: Schema.String },
})
type Message = typeof Message.Type

const Application = defineApplication({ Model, Message })
const ApplicationComposition = Application.makeComposition()

const FetchUser = Application.command('FetchUser', {
  args: { userId: Schema.String },
  messages: [Message.SucceededFetchUser, Message.FailedFetchUser],
  handler: function* () {
    return ({ userId }) =>
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
      )
  },
})

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedFetchUser: ({ userId }) => ({
      model: modifyFields(model, { user: () => UserState.Loading() }),
      commands: [FetchUser({ userId })],
    }),
    SucceededFetchUser: ({ data }) => ({
      model: modifyFields(model, { user: () => UserState.Success({ data }) }),
    }),
    FailedFetchUser: ({ error }) => ({
      model: modifyFields(model, { user: () => UserState.Failure({ error }) }),
    }),
  }),
)
