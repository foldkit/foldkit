import { Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotUiPageMessage, type Message } from '../message'
import { GotVirtualListDemoMessage } from '../page/ui/message'

export const SubscriptionDeps = S.Struct({
  containerEvents: Ui.VirtualList.SubscriptionDeps.fields['containerEvents'],
})

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  containerEvents: {
    modelToDependencies: model =>
      Ui.VirtualList.subscriptions.containerEvents.modelToDependencies(
        model.uiPages.virtualListDemo,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      Ui.VirtualList.subscriptions.containerEvents
        .dependenciesToStream(dependencies, readDependencies)
        .pipe(
          Stream.map(message =>
            GotUiPageMessage({
              message: GotVirtualListDemoMessage({ message }),
            }),
          ),
        ),
  },
})
