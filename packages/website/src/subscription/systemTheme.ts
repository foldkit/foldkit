import { Effect, Option, Schema, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { DARK_COLOR_SCHEME_QUERY } from '../colorScheme'
import { Message } from '../message'
import { type Model } from '../model'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  systemTheme: entry(
    { isSystemPreference: Schema.Boolean },
    {
      modelToDependencies: model => ({
        isSystemPreference: Option.exists(
          model.maybeThemePreference,
          preference => preference === 'System',
        ),
      }),
      dependenciesToStream: ({ isSystemPreference }) =>
        Stream.when(
          Subscription.fromMediaQuery({
            query: DARK_COLOR_SCHEME_QUERY,
            mapMatches: isDark =>
              Message.ChangedSystemTheme({ theme: isDark ? 'Dark' : 'Light' }),
          }),
          Effect.sync(() => isSystemPreference),
        ),
    },
  ),
}))
