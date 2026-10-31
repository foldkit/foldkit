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

const Message = defineMessageUnion({
  ClickedLoadProfile: {},
  CompletedFetchProfile: {},
  FailedFetchProfile: {},
})

// 2. Require a Redacted value because DevTools records Command arguments.
const FetchProfile = Command.define('FetchProfile', {
  args: { accessToken: AccessToken },
  messages: [Message.CompletedFetchProfile, Message.FailedFetchProfile],
})

// 3. Store the wrapper in the Model, never the raw string.
export class Profile extends Block<
  Profile,
  Readonly<{ rawAccessToken: string }>
>()('Profile', {
  Model: Schema.Struct({ accessToken: AccessToken }),
  Message,
  Command: [FetchProfile],
}) {}

export const ProfileLive = Profile.make(
  Effect.fn(function* (_id, { rawAccessToken }) {
    return {
      model: { accessToken: makeAccessToken(rawAccessToken) },

      update: {
        ClickedLoadProfile: model => ({
          model,
          commands: [FetchProfile({ accessToken: model.accessToken })],
        }),
        CompletedFetchProfile: model => ({ model }),
        FailedFetchProfile: model => ({ model }),
      },

      commands: {
        FetchProfile: ({ accessToken }) =>
          Effect.tryPromise(() =>
            fetch('/api/profile', {
              headers: {
                // 4. Recover the raw token only at the request that needs it.
                Authorization: `Bearer ${Redacted.value(accessToken)}`,
              },
            }),
          ).pipe(
            Effect.as(Message.CompletedFetchProfile()),
            Effect.catch(() => Effect.succeed(Message.FailedFetchProfile())),
          ),
      },
    }
  }),
)
