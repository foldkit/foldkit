import { Number, Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Menu, Tabs } from '@foldkit/ui'

import { ExampleSlug } from '../example/meta'
import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import { type ManagedResourceServices } from './managedResources'
import { Message, OutMessage } from './message'
import { type Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'

// UPDATE

const PlaygroundMenu = Menu.create<ExampleSlug>()

const selectDemoTab = (
  model: Model,
  tab: DemoTab.Tab,
): Update.Return<Model, Message> => ({
  model: evo(model, { activeDemoTab: () => tab }),
})

const selectPlaygroundExample = (
  model: Model,
  exampleSlug: ExampleSlug,
): Update.ReturnWithOutMessage<Model, Message, OutMessage> => ({
  model,
  outMessage: OutMessage.SelectedPlaygroundExample({ exampleSlug }),
})

const foldDemoTabsOutMessage = Tabs.OutMessage.match<
  Update.Step<Model, Message>,
  Tabs.OutMessage<DemoTab.Tab>
>({
  Selected:
    ({ value }) =>
    model =>
      selectDemoTab(model, value),
})

const foldDemoTabs = Update.foldChild({
  update: DemoTab.DemoTabs.update,
  read: (model: Model) => Option.some(model.demoTabs),
  write: (model, nextDemoTabs) => evo(model, { demoTabs: () => nextDemoTabs }),
  toParentMessage: message => Message.GotDemoTabsMessage({ message }),
  foldOutMessage: foldDemoTabsOutMessage,
})

const foldPlaygroundMenuOutMessage = Menu.OutMessage.match<
  Update.StepWithOutMessage<Model, Message, OutMessage>,
  Menu.OutMessage<ExampleSlug>
>({
  // NOTE: A fresh document load preserves the COEP/COOP headers required by
  // WebContainer. SPA navigation would reuse the current document.
  Selected:
    ({ value }) =>
    model =>
      selectPlaygroundExample(model, value),
})

const foldPlaygroundMenu = Update.foldChild({
  update: PlaygroundMenu.update,
  read: (model: Model) => Option.some(model.playgroundMenu),
  write: (model, nextPlaygroundMenu) =>
    evo(model, { playgroundMenu: () => nextPlaygroundMenu }),
  toParentMessage: message => Message.GotPlaygroundMenuMessage({ message }),
  foldOutMessage: foldPlaygroundMenuOutMessage,
})

const foldAsyncCounterDemo = Update.foldChild({
  update: AsyncCounterDemo.update,
  read: (model: Model) => Option.some(model.asyncCounterDemo),
  write: (model, nextAsyncCounterDemo) =>
    evo(model, { asyncCounterDemo: () => nextAsyncCounterDemo }),
  toParentMessage: message => Message.GotAsyncCounterDemoMessage({ message }),
})

const foldNotePlayerDemo = Update.foldChild({
  update: NotePlayerDemo.update,
  read: (model: Model) => Option.some(model.notePlayerDemo),
  write: (model, nextNotePlayerDemo) =>
    evo(model, { notePlayerDemo: () => nextNotePlayerDemo }),
  toParentMessage: message => Message.GotNotePlayerDemoMessage({ message }),
})

type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage,
  ManagedResourceServices
>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ToggledAiHeading: () => ({
      model: evo(model, { aiHeadingToggleCount: Number.increment }),
    }),
    GotDemoTabsMessage: ({ message }) => foldDemoTabs(model, message),
    GotPlaygroundMenuMessage: ({ message }) =>
      foldPlaygroundMenu(model, message),
    GotAsyncCounterDemoMessage: ({ message }) =>
      foldAsyncCounterDemo(model, message),
    GotNotePlayerDemoMessage: ({ message }) =>
      foldNotePlayerDemo(model, message),
  })
