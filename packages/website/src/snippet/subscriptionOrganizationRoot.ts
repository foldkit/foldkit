// subscription.ts
import { Effect, Layer as EffectLayer, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import * as Settings from './settings'

const settingsSubscriptions = Subscription.lift(Settings.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.settings),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

const localSubscriptions = Subscription.make<Model, Message>()(entry => ({
  systemTheme: entry(
    'SystemThemeChanges',
    { isSystemPreference: Schema.Boolean },
    {
      messages: [Message.ChangedSystemTheme],
      modelToDependencies: model => ({
        isSystemPreference: model.themePreference === 'System',
      }),
    },
  ),
}))

export const subscriptions = Subscription.aggregate(
  settingsSubscriptions,
  localSubscriptions,
)

const SystemThemeChangesLayer = localSubscriptions.systemTheme.toLayer(
  ({ isSystemPreference }) =>
    Stream.when(
      Dom.streamFromMediaQuery({
        query: '(prefers-color-scheme: dark)',
        mapMatches: isDark =>
          Message.ChangedSystemTheme({ theme: isDark ? 'Dark' : 'Light' }),
      }),
      Effect.sync(() => isSystemPreference),
    ),
)

export const Layer = EffectLayer.mergeAll(
  Settings.Layer,
  SystemThemeChangesLayer,
)
