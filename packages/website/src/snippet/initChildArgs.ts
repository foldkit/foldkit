import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Settings } from './blockSettingsContract'
import type { Flags } from './initThemeFlags'

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model: Schema.Struct({ settings: Settings }),
}) {}

export const ApplicationLive = Application.toLayer(() => ({
  init: ({ flags }) => ({
    settings: new Settings('settings', { initialTheme: flags.savedTheme }),
  }),

  view: model => ({
    title: 'Settings',
    body: model.settings.view(),
  }),
}))
