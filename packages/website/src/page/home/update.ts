import { Number, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Menu, Tabs } from '@foldkit/ui'

import { ExampleSlug } from '../example/meta'
import * as AsyncCounterDemo from './asyncCounterDemo'
import * as DemoTab from './demoTab'
import { Message, OutMessage } from './message'
import { type Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'

// UPDATE

const PlaygroundMenu = Menu.create<ExampleSlug>()

const selectDemoTab = (model: Model, tab: DemoTab.Tab) => ({
  model: modifyFields(model, { activeDemoTab: () => tab }),
})

const selectPlaygroundExample = (model: Model, exampleSlug: ExampleSlug) => ({
  model,
  outMessage: OutMessage.SelectedPlaygroundExample({ exampleSlug }),
})

const foldDemoTabsOutMessage = (outMessage: Tabs.OutMessage<DemoTab.Tab>) =>
  Tabs.OutMessage.match(outMessage, {
    Selected: ({ value }) =>
      Update.makeStep((model: Model) => selectDemoTab(model, value)),
  })

const foldDemoTabs = Update.foldChild({
  update: DemoTab.DemoTabs.update,
  read: (model: Model) => Option.some(model.demoTabs),
  write: (model, nextDemoTabs) =>
    modifyFields(model, { demoTabs: () => nextDemoTabs }),
  toParentMessage: message => Message.GotDemoTabsMessage({ message }),
  foldOutMessage: foldDemoTabsOutMessage,
})

const foldPlaygroundMenuOutMessage = (
  outMessage: Menu.OutMessage<ExampleSlug>,
) =>
  Menu.OutMessage.match(outMessage, {
    // NOTE: A fresh document load preserves the COEP/COOP headers required by
    // WebContainer. SPA navigation would reuse the current document.
    Selected: ({ value }) =>
      Update.makeStep((model: Model) => selectPlaygroundExample(model, value)),
  })

const foldPlaygroundMenu = Update.foldChild({
  update: PlaygroundMenu.update,
  read: (model: Model) => Option.some(model.playgroundMenu),
  write: (model, nextPlaygroundMenu) =>
    modifyFields(model, { playgroundMenu: () => nextPlaygroundMenu }),
  toParentMessage: message => Message.GotPlaygroundMenuMessage({ message }),
  foldOutMessage: foldPlaygroundMenuOutMessage,
})

const foldAsyncCounterDemo = Update.foldChild({
  update: AsyncCounterDemo.update,
  read: (model: Model) => Option.some(model.asyncCounterDemo),
  write: (model, nextAsyncCounterDemo) =>
    modifyFields(model, { asyncCounterDemo: () => nextAsyncCounterDemo }),
  toParentMessage: message => Message.GotAsyncCounterDemoMessage({ message }),
})

const foldNotePlayerDemo = Update.foldChild({
  update: NotePlayerDemo.update,
  read: (model: Model) => Option.some(model.notePlayerDemo),
  write: (model, nextNotePlayerDemo) =>
    modifyFields(model, { notePlayerDemo: () => nextNotePlayerDemo }),
  toParentMessage: message => Message.GotNotePlayerDemoMessage({ message }),
})

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ToggledAiHeading: () => ({
      model: modifyFields(model, { aiHeadingToggleCount: Number.increment }),
    }),
    GotDemoTabsMessage: ({ message }) => foldDemoTabs(model, message),
    GotPlaygroundMenuMessage: ({ message }) =>
      foldPlaygroundMenu(model, message),
    GotAsyncCounterDemoMessage: ({ message }) =>
      foldAsyncCounterDemo(model, message),
    GotNotePlayerDemoMessage: ({ message }) =>
      foldNotePlayerDemo(model, message),
  }),
)
