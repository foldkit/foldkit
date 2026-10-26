import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
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

const Message = defineMessageUnion({
  ClickedFetchUser: { userId: Schema.String },
  SucceededFetchUser: { data: UserSchema },
  FailedFetchUser: { error: Schema.String },
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ApplicationComposition = ApplicationDefinition.makeComposition()

const FetchUser = ApplicationDefinition.makeCommand('FetchUser', {
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

const update = ApplicationComposition.makeUpdate({
  ClickedFetchUser: (model, { userId }) => ({
    model: modifyFields(model, { user: () => UserState.Loading() }),
    commands: [FetchUser({ userId })],
  }),
  SucceededFetchUser: (model, { data }) => ({
    model: modifyFields(model, { user: () => UserState.Success({ data }) }),
  }),
  FailedFetchUser: (model, { error }) => ({
    model: modifyFields(model, { user: () => UserState.Failure({ error }) }),
  }),
})
