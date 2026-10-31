// ✅ Good: the parent reads the theme from the Settings instance.

import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Settings } from './blockSettingsContract'

export class Account extends Block<Account>()('Account', {
  Model: Schema.Struct({ settings: Settings }),
}) {}

export const AccountLive = Account.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings', {
      initialTheme: 'System',
    })

    return {
      model: { settings },

      view: (model, h) =>
        h.div(
          [],
          [
            h.p([], [`Theme: ${model.settings.model.theme}`]),
            model.settings.view(),
          ],
        ),
    }
  }),
)
