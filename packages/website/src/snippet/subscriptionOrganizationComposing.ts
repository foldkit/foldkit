// page/settings/subscription.ts
import { Effect, Layer, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import * as ThemeMenu from './themeMenu'

const themeMenuSubscriptions = Subscription.lift(ThemeMenu.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.themeMenu),
  toParentMessage: message => Message.GotThemeMenuMessage({ message }),
})

const localSubscriptions = Subscription.make<Model, Message>()(entry => ({
  unsavedChangesNavigationWarnings: entry(
    'UnsavedChangesNavigationWarnings',
    { hasUnsavedChanges: Schema.Boolean },
    {
      messages: [Message.StartedNavigationAway],
      modelToDependencies: model => ({
        hasUnsavedChanges: model.hasUnsavedChanges,
      }),
    },
  ),
}))

export const subscriptions = Subscription.aggregate(
  themeMenuSubscriptions,
  localSubscriptions,
)

const UnsavedChangesNavigationWarningsLayer =
  localSubscriptions.unsavedChangesNavigationWarnings.toLayer(
    Effect.succeed(({ hasUnsavedChanges }) =>
      Stream.when(
        Dom.streamFromEventFilterMapPreventDefault({
          target: window,
          type: 'beforeunload',
          filterMapEvent: event => {
            event.returnValue = true
            return Option.some(Message.StartedNavigationAway())
          },
        }),
        Effect.sync(() => hasUnsavedChanges),
      ),
    ),
  )

export const EffectsLayer = Layer.mergeAll(
  ThemeMenu.EffectsLayer,
  UnsavedChangesNavigationWarningsLayer,
)
