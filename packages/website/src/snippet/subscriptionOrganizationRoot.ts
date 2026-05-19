// subscription.ts
import { Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import { ChangedSystemTheme, GotSettingsMessage, type Message } from './message'
import type { Model } from './model'
import * as Settings from './settings'

const settingsSubscriptions = Subscription.lift(Settings.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.settings,
  toParentMessage: message => GotSettingsMessage({ message }),
})

const localSubscriptions = Subscription.make<Model, Message>()(entry => ({
  systemTheme: entry(
    { isSystemPreference: S.Boolean },
    {
      modelToDependencies: model => ({
        isSystemPreference: model.themePreference === 'System',
      }),
      dependenciesToStream: ({ isSystemPreference }) =>
        Stream.when(
          Stream.fromEventListener<MediaQueryListEvent>(
            window.matchMedia('(prefers-color-scheme: dark)'),
            'change',
          ).pipe(Stream.map(ChangedSystemTheme)),
          Effect.sync(() => isSystemPreference),
        ),
    },
  ),
}))

export const subscriptions = Subscription.aggregate<Model, Message>()(
  settingsSubscriptions,
  localSubscriptions,
)
