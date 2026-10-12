import { Option } from 'effect'
import { Application, ManagedResource, Subscription } from 'foldkit'

import { mounts } from './layer'
import { Flags, Model, init, update, view } from './main'
import { Message } from './message'
import { Home, Playground, Ui } from './page'
import * as Subscriptions from './subscription'

const uiPagesSubscriptions = Subscription.lift(Ui.subscriptions)<
  Model,
  Message
>({
  read: model => Option.some(model.uiPages),
  toParentMessage: message => Message.GotUiPageMessage({ message }),
})

export const subscriptions = Subscription.aggregate(
  Subscriptions.ActiveSection.subscriptions,
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
    mounts,
    container,
    routing: {
      onUrlRequest: request => Message.ClickedLink({ request }),
      onUrlChange: url => Message.ChangedUrl({ url }),
    },
    devTools: {
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
      banner:
        'Welcome to Foldkit DevTools. This site runs on Foldkit. Select a recorded Message to inspect its payload, Model changes, returned Commands, and Mount activity. Browse earlier states in the timeline. In development, you can pause and resume the view, and AI agents can inspect the history through MCP.',
      Message,
    },
  })
