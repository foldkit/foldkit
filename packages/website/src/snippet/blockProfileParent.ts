import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Settings, Theme } from './blockSettingsContract'

export class Profile extends Block<Profile>()('Profile', {
  Model: Schema.Struct({
    displayName: Schema.String,
    previewTheme: Theme,
    settings: Settings,
  }),
}) {}

export const ProfileLive = Profile.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings', {
      initialTheme: 'System',
    })

    return {
      model: { displayName: 'Ada', previewTheme: 'System', settings },

      update: {
        ...settings.on({
          ChangedTheme: (model, { theme }) => ({
            model: modifyFields(model, { previewTheme: () => theme }),
          }),
        }),
      },

      view: (model, h) =>
        h.section(
          [h.DataAttribute('theme', model.previewTheme)],
          [h.h1([], [model.displayName]), model.settings.view()],
        ),
    }
  }),
)
