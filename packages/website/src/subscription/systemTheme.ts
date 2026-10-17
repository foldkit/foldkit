import { Effect, Option, Schema, Stream } from 'effect'
import { Dom } from 'foldkit'

import { DARK_COLOR_SCHEME_QUERY } from '../colorScheme'
import { Application } from '../definition'
import { Message } from '../message'

export const subscriptions = Application.subscriptions(entry => ({
  systemThemeChanges: entry(
    'SystemThemeChanges',
    { isSystemPreference: Schema.Boolean },
    {
      messages: [Message.ChangedSystemTheme],
      modelToDependencies: model => ({
        isSystemPreference: Option.exists(
          model.maybeThemePreference,
          preference => preference === 'System',
        ),
      }),
      handler: function* () {
        return ({ isSystemPreference }) =>
          Stream.when(
            Dom.streamFromMediaQuery({
              query: DARK_COLOR_SCHEME_QUERY,
              mapMatches: isDark =>
                Message.ChangedSystemTheme({
                  theme: isDark ? 'Dark' : 'Light',
                }),
            }),
            Effect.sync(() => isSystemPreference),
          )
      },
    },
  ),
}))

export const EffectsLayer = subscriptions.systemThemeChanges.layer
