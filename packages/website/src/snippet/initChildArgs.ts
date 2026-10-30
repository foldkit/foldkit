import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Settings } from './blockSettingsContract'
import type { Flags } from './initThemeFlags'

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model: Schema.Struct({ settings: Settings }),
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    const settings = yield* new Settings('settings', {
      initialTheme: flags.savedTheme,
    })

    return {
      model: { settings },

      view: (model, h) => ({
        title: 'Settings',
        body: model.settings.view(),
      }),
    }
  }),
)
