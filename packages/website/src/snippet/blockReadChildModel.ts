import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import { Settings } from './blockSettingsContract'

export class Header extends Block<Header>()('Header', {
  Model: Schema.Struct({ settings: Settings }),
}) {}

export const HeaderLive = Header.make(
  Effect.fn(function* () {
    const settings = yield* new Settings('settings', {
      initialTheme: 'System',
    })

    return {
      model: { settings },

      view: (model, h) =>
        h.header(
          [h.DataAttribute('theme', model.settings.model.theme)],
          [h.span([], [`Theme: ${model.settings.model.theme}`])],
        ),
    }
  }),
)
