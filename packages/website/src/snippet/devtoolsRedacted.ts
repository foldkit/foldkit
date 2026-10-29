import { Effect, Redacted, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const accessTokenLabel = 'access token'

// 1. Prevent JSON encoding, and give the placeholder a useful label.
const AccessToken = Schema.Redacted(Schema.String, {
  label: accessTokenLabel,
  disallowJsonEncode: true,
})
type AccessToken = typeof AccessToken.Type

const makeAccessToken = (accessToken: string): AccessToken =>
  Redacted.make(accessToken, { label: accessTokenLabel })

// 2. Store the wrapper in the Model, never the raw string.
const Model = Schema.Struct({ accessToken: AccessToken })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedFetchProfile: {},
  FailedFetchProfile: {},
})
type Message = typeof Message.Type

const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const init = ApplicationComposition.makeInit((accessToken: string) => ({
  model: { accessToken: makeAccessToken(accessToken) },
}))

const FetchProfile = Command.define('FetchProfile', {
  // 3. Require a Redacted value because DevTools records Command arguments.
  args: { accessToken: AccessToken },
  messages: [Message.CompletedFetchProfile, Message.FailedFetchProfile],
  handler: function* () {
    return ({ accessToken }) =>
      Effect.tryPromise(() =>
        fetch('/api/profile', {
          headers: {
            // 4. Recover the raw token only at the request boundary that needs it.
            Authorization: `Bearer ${Redacted.value(accessToken)}`,
          },
        }),
      ).pipe(
        Effect.as(Message.CompletedFetchProfile()),
        Effect.catch(() => Effect.succeed(Message.FailedFetchProfile())),
      )
  },
})

const fetchProfile = (model: Model) =>
  FetchProfile({ accessToken: model.accessToken })
