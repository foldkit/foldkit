import { Option } from 'effect'
import { Application, ManagedResource, Subscription } from 'foldkit'

import { Flags, Model, init, update, view } from './main'
import { Message } from './message'
import { Example, Home, Playground, Ui } from './page'
import * as SnippetDisclosure from './snippetDisclosure'
import * as Subscriptions from './subscription'

const homeSubscriptions = Subscription.lift(Home.subscriptions)<Model, Message>(
  {
    read: model => model.maybeHome,
    toParentMessage: message => Message.GotHomeMessage({ message }),
  },
)

const uiPagesSubscriptions = Subscription.lift(Ui.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.uiPages),
  toParentMessage: message => Message.GotUiPageMessage({ message }),
})

export const subscriptions = Subscription.aggregate(
  Subscriptions.ActiveSection.subscriptions,
  homeSubscriptions,
  uiPagesSubscriptions,
  Subscriptions.SearchShortcut.subscriptions,
  Subscriptions.SystemTheme.subscriptions,
  Subscriptions.ViewportWidth.subscriptions,
)

const playgroundManagedResources = ManagedResource.lift(
  Playground.managedResources,
)<Model, Message>({
  read: model =>
    Option.filter(model.playground, () =>
      Option.contains(model.maybeIsPlaygroundSupported, true),
    ),
  toParentMessage: message => Message.GotPlaygroundMessage({ message }),
})

const homeManagedResources = ManagedResource.lift(Home.managedResources)<
  Model,
  Message
>({
  read: model => model.maybeHome,
  toParentMessage: message => Message.GotHomeMessage({ message }),
})

export const managedResources = ManagedResource.aggregate(
  homeManagedResources,
  playgroundManagedResources,
)

export const makeApplication = (container: HTMLElement | null) =>
  Application.make({
    Model,
    Flags,
    init,
    update,
    view,
    subscriptions,
    managedResources,
    mounts: [
      ...Ui.mounts,
      SnippetDisclosure.MeasureSnippetHeight,
      ...Playground.mounts,
      ...Example.mounts,
    ],
    container,
    routing: {
      onUrlRequest: request => Message.ClickedLink({ request }),
      onUrlChange: url => Message.ChangedUrl({ url }),
    },
    devTools: {
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
      banner:
        'Welcome to Foldkit DevTools. This site runs on Foldkit. Navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
      Message,
    },
  })
