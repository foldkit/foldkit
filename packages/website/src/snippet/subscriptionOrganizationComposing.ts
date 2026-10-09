// page/settings/subscription.ts
import { Effect, Layer, Option, Schema, Stream } from 'effect'
import { Dom, Subscription } from 'foldkit'

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
  read: model => Option.some(model.themeMenu),
  toParentMessage: message => GotThemeMenuMessage({ message }),
})

const localSubscriptions = Subscription.make<Model, Message>()(entry => ({
  unsavedChangesWarning: entry(
    'UnsavedChangesNavigationWarnings',
    { hasUnsavedChanges: Schema.Boolean },
    {
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

const UnsavedChangesNavigationWarningsLive =
  localSubscriptions.unsavedChangesWarning.toLayer(({ hasUnsavedChanges }) =>
    Stream.when(
      Dom.streamFromEventFilterMapPreventDefault({
        target: window,
        type: 'beforeunload',
        filterMapEvent: event => {
          event.returnValue = true
          return Option.some(StartedNavigationAway())
        },
      }),
      Effect.sync(() => hasUnsavedChanges),
    ),
  )

export const Live = Layer.mergeAll(
  ThemeMenu.Live,
  UnsavedChangesNavigationWarningsLive,
)
