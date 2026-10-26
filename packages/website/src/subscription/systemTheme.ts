import { Effect, Option, Schema, Stream } from 'effect'
import { Dom } from 'foldkit'

import { DARK_COLOR_SCHEME_QUERY } from '../colorScheme'
import { ApplicationDefinition } from '../definition'
import { Message } from '../message'

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
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
