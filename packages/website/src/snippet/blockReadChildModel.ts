import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Settings } from './blockSettingsContract'

export class Header extends Block<Header>()('Header', {
  Model: Schema.Struct({ settings: Settings }),
}) {}

export const HeaderLive = Header.toLayer(() => ({
  init: () => ({
    settings: new Settings('settings', { initialTheme: 'System' }),
  }),

  view: (model, h) =>
    h.header(
      [h.DataAttribute('theme', model.settings.model.theme)],
      [h.span([], [`Theme: ${model.settings.model.theme}`])],
    ),
}))
