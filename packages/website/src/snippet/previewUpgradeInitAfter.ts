import { Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Theme } from './previewMigrationCommandAfter'

export class ThemePicker extends Block<
  ThemePicker,
  Readonly<{ theme: Theme }>
>()('ThemePicker', {
  Model: Schema.Struct({ theme: Theme }),
}) {}

export const ThemePickerLive = ThemePicker.toLayer(() => ({
  init: ({ theme }) => ({ theme }),
  view: (model, h) => h.p([], [`Theme: ${model.theme}`]),
}))

const Message = defineMessageUnion({
  SucceededLoadAvatar: { url: Schema.String },
  FailedLoadAvatar: {},
})

const LoadAvatar = Command.define('LoadAvatar', {
  args: { username: Schema.String },
  messages: [Message.SucceededLoadAvatar, Message.FailedLoadAvatar],
})

type ProfileArgs = Readonly<{ username: string; savedTheme: Theme }>

export class Profile extends Block<Profile, ProfileArgs>()('Profile', {
  Model: Schema.Struct({
    username: Schema.String,
    avatarUrl: Schema.String,
    themePicker: ThemePicker,
  }),
  Message,
  Command: [LoadAvatar],
}) {}

export const ProfileLive = Profile.toLayer(() => ({
  // The parent passes the child's args when it creates the instance.
  init: ({ username, savedTheme }) => ({
    username,
    avatarUrl: '',
    themePicker: new ThemePicker('themePicker', { theme: savedTheme }),
  }),
  // `start` replaces the Commands init returned.
  start: model => [LoadAvatar({ username: model.username })],

  update: {
    SucceededLoadAvatar: (model, { url }) => ({
      model: modifyFields(model, { avatarUrl: () => url }),
    }),
    FailedLoadAvatar: model => ({ model }),
  },

  commands: {
    LoadAvatar: ({ username }) =>
      Effect.succeed(
        Message.SucceededLoadAvatar({ url: `/avatars/${username}.png` }),
      ),
  },

  view: (model, h) =>
    h.section(
      [],
      [
        h.img([h.Src(model.avatarUrl), h.Alt(model.username)]),
        model.themePicker.view(),
      ],
    ),
})).pipe(Layer.provide(ThemePickerLive))
