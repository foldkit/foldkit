// page/settings/subscription.ts
import { Effect, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import {
  GotThemeMenuMessage,
  type Message,
  StartedNavigationAway,
} from './message'
import type { Model } from './model'
import * as ThemeMenu from './themeMenu'

const themeMenuSubscriptions = Subscription.lift(ThemeMenu.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.themeMenu,
  toParentMessage: message => GotThemeMenuMessage({ message }),
})

const localSubscriptions = Subscription.make<Model, Message>()(entry => ({
  unsavedChangesWarning: entry(
    { hasUnsavedChanges: S.Boolean },
    {
      modelToDependencies: model => ({
        hasUnsavedChanges: model.hasUnsavedChanges,
      }),
      dependenciesToStream: ({ hasUnsavedChanges }) =>
        Stream.when(
          Stream.fromEventListener<BeforeUnloadEvent>(
            window,
            'beforeunload',
          ).pipe(Stream.map(StartedNavigationAway)),
          Effect.sync(() => hasUnsavedChanges),
        ),
    },
  ),
}))

export const subscriptions = Subscription.aggregate<Model, Message>()(
  themeMenuSubscriptions,
  localSubscriptions,
)
