import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Settings } from './blockSettingsContract'

export class Account extends Block<Account>()('Account', {
  Model: Schema.Struct({ settings: Settings }),
  Message: defineMessageUnion({ ClickedSignOut: {} }),
}) {}

export const AccountLive = Account.toLayer(() => ({
  init: () => ({
    settings: new Settings('settings', { initialTheme: 'System' }),
  }),

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
        h.button([h.OnClick(Account.Message.ClickedSignOut())], ['Sign out']),
      ],
    ),
}))
