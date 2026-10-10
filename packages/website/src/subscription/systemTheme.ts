import { Effect, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { DARK_COLOR_SCHEME_QUERY } from '../colorScheme'
import { Message } from '../message'
import { type Model } from '../model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
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
    },
    Effect.succeed(({ isSystemPreference }) =>
      Stream.when(
        Dom.streamFromMediaQuery({
          query: DARK_COLOR_SCHEME_QUERY,
          mapMatches: isDark =>
            Message.ChangedSystemTheme({ theme: isDark ? 'Dark' : 'Light' }),
        }),
        Effect.sync(() => isSystemPreference),
      ),
    ),
  ),
}))

export const EffectsLayer = subscriptions.systemThemeChanges.layer
