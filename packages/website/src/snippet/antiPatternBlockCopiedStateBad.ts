// ❌ Bad: the parent keeps its own copy of the theme Settings owns.

import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Settings, Theme } from './blockSettingsContract'

export class Account extends Block<Account>()('Account', {
  Model: Schema.Struct({ settings: Settings, theme: Theme }),
}) {}

export const AccountLive = Account.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings', {
      initialTheme: 'System',
    })

    return {
      model: { settings, theme: 'System' },

      update: {
        ...settings.on({
          ChangedTheme: (model, { theme }) => ({
            model: modifyFields(model, { theme: () => theme }),
          }),
        }),
      },

      view: (model, h) =>
        h.div([], [h.p([], [`Theme: ${model.theme}`]), model.settings.view()]),
    }
  }),
)
