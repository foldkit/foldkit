import { Application, ManagedResource, Subscription } from 'foldkit'

import { init } from './init'
import { Message } from './message'
import { Model } from './model'
import { Home, Products } from './page'
import { update } from './update'
import { view } from './view'

const homeSubscriptions = Subscription.lift(Home.subscriptions)<Model, Message>(
  {
    read: model => model.maybeHome,
    toParentMessage: message => Message.GotHomeMessage({ message }),
  },
)

export const subscriptions = Subscription.aggregate(
  homeSubscriptions,
  Subscription.lift(Products.subscriptions)<Model, Message>({
    read: model => model.maybeProducts,
    toParentMessage: message => Message.GotProductsMessage({ message }),
  }),
)

export const managedResources = ManagedResource.lift(Products.managedResources)<
  Model,
  Message
>({
  read: model => model.maybeProducts,
  toParentMessage: message => Message.GotProductsMessage({ message }),
})

export const makeApplication = (container: HTMLElement | null) =>
  Application.make({
    Model,
    init,
    update,
    view,
    subscriptions,
    managedResources,
    mounts: Products.mounts,
    container,
    routing: {
      onUrlRequest: request => Message.ClickedLink({ request }),
      onUrlChange: url => Message.ChangedUrl({ url }),
    },
  })
