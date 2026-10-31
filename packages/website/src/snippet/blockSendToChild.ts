import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Settings } from './blockSettingsContract'

export class Account extends Block<Account>()('Account', {
  Model: Schema.Struct({ settings: Settings }),
  Message: defineMessageUnion({ ClickedSignOut: {} }),
}) {}

export const AccountLive = Account.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings', {
      initialTheme: 'System',
    })

    return {
      model: { settings },

      update: {
        ClickedSignOut: model => ({
          model,
          messages: [model.settings.send(Settings.Message.RequestedReset())],
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            model.settings.view(),
            h.button(
              [h.OnClick(Account.Message.ClickedSignOut())],
              ['Sign out'],
            ),
          ],
        ),
    }
  }),
)
