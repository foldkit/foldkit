import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Settings, SettingsLive, Theme } from './previewMigrationCommandAfter'

export class Preferences extends Block<Preferences>()('Preferences', {
  Model: Schema.Struct({ settings: Settings }),
  OutMessage: defineMessageUnion({ ChangedTheme: { theme: Theme } }),
}) {}

export const PreferencesLive = Preferences.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings')

    return {
      model: { settings },

      update: {
        // Forwarding is an `.on` handler that returns the parent's OutMessage.
        ...settings.on({
          ChangedTheme: (model, { theme }) => ({
            model,
            outMessage: Preferences.OutMessage.ChangedTheme({ theme }),
          }),
        }),
      },

      view: model => model.settings.view(),
    }
  }),
).pipe(Layer.provide(SettingsLive))
