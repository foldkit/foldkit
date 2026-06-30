import { Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { type Model } from '../main'
import { ChangedSystemTheme, type Message } from '../message'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  systemTheme: entry(
    { isSystemPreference: S.Boolean },
    {
      modelToDependencies: model => ({
        isSystemPreference: model.themePreference === 'System',
      }),
      dependenciesToStream: ({ isSystemPreference }) =>
        Stream.when(
          Subscription.fromEvent<
            MediaQueryListEvent,
            typeof ChangedSystemTheme.Type
          >({
            target: () => window.matchMedia('(prefers-color-scheme: dark)'),
            type: 'change',
            toMessage: event =>
              ChangedSystemTheme({ theme: event.matches ? 'Dark' : 'Light' }),
          }),
          Effect.sync(() => isSystemPreference),
        ),
    },
  ),
}))
