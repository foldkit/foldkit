import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const Profile = Schema.Struct({ name: Schema.String })

class ProfileApi extends Context.Service<
  ProfileApi,
  Readonly<{
    load: (userId: string) => Effect.Effect<typeof Profile.Type, Error>
  }>
>()('ProfileApi') {}

const ProfileState = defineTaggedUnion({
  Loading: {},
  Loaded: { profile: Profile },
  Failed: {},
})

const Message = defineMessageUnion({
  SucceededLoadProfile: { profile: Profile },
  FailedLoadProfile: {},
})

const LoadProfile = Command.define('LoadProfile', {
  args: { userId: Schema.String },
  messages: [Message.SucceededLoadProfile, Message.FailedLoadProfile],
})

export class ProfileCard extends Block<
  ProfileCard,
  Readonly<{ userId: string }>
>()('ProfileCard', {
  Model: Schema.Struct({ profileState: ProfileState }),
  Message,
  Command: [LoadProfile],
}) {}

export const ProfileCardLive = ProfileCard.make(
  Effect.fn(function* (_id, { userId }) {
    const profileApi = yield* ProfileApi

    return {
      model: { profileState: ProfileState.Loading() },
      start: [LoadProfile({ userId })],

      update: {
        SucceededLoadProfile: (model, { profile }) => ({
          model: modifyFields(model, {
            profileState: () => ProfileState.Loaded({ profile }),
          }),
        }),
        FailedLoadProfile: model => ({
          model: modifyFields(model, {
            profileState: () => ProfileState.Failed(),
          }),
        }),
      },

      commands: {
        LoadProfile: ({ userId }) =>
          profileApi.load(userId).pipe(
            Effect.map(profile => Message.SucceededLoadProfile({ profile })),
            Effect.catch(() => Effect.succeed(Message.FailedLoadProfile())),
          ),
      },

      view: (model, h) =>
        ProfileState.match(model.profileState, {
          Loading: () => h.p([], ['Loading profile']),
          Loaded: ({ profile }) => h.p([], [profile.name]),
          Failed: () => h.p([h.Role('alert')], ['Could not load the profile']),
        }),
    }
  }),
)
