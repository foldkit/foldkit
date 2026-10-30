// ✅ Good: the parent sends a request Settings declares for it.

import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Settings } from './blockSettingsContract'

export class Account extends Block<Account>()('Account', {
  Model: Schema.Struct({ settings: Settings }),
  Message: defineMessageUnion({ ClickedResetSettings: {} }),
}) {}

export const AccountLive = Account.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings', {
      initialTheme: 'System',
    })

    return {
      model: { settings },

      update: {
        ClickedResetSettings: model => ({
          model,
          messages: [model.settings.send(Settings.Message.RequestedReset())],
        }),
      },
    }
  }),
)
