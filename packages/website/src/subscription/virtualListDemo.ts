import { Schema as S, Stream } from 'effect'
import { Subscription, Ui } from 'foldkit'

import type { Model } from '../main'
import { GotUiPageMessage, type Message } from '../message'
import {
  GotVirtualListDemoMessage,
  GotVirtualListVariableDemoMessage,
} from '../page/ui/message'

export const SubscriptionDependencies = S.Struct({
  containerEvents:
    Ui.VirtualList.SubscriptionDependencies.fields['containerEvents'],
  variableContainerEvents:
    Ui.VirtualList.SubscriptionDependencies.fields['containerEvents'],
})

export const subscriptions = Subscription.makeSubscriptions(
  SubscriptionDependencies,
)<Model, Message>({
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
  variableContainerEvents: {
    modelToDependencies: model =>
      Ui.VirtualList.subscriptions.containerEvents.modelToDependencies(
        model.uiPages.virtualListVariableDemo,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      Ui.VirtualList.subscriptions.containerEvents
        .dependenciesToStream(dependencies, readDependencies)
        .pipe(
          Stream.map(message =>
            GotUiPageMessage({
              message: GotVirtualListVariableDemoMessage({ message }),
            }),
          ),
        ),
  },
})
