import { Tuple } from 'effect'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as AsyncCounterDemo from './asyncCounterDemo'
import { Home } from './definition'
import * as DemoTab from './demoTab'
import { Message, OutMessage } from './message'
import { Model } from './model'
import * as NotePlayerDemo from './notePlayerDemo'
import { PlaygroundMenu } from './playgroundMenu'

const foldDemoTabsOutMessage = DemoTab.DemoTabs.OutMessage.match<
  Update.Step<Model, Message>,
  typeof DemoTab.DemoTabs.OutMessage.Type
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { activeDemoTab: () => value }),
    }),
})

export const DemoTabsBinding = Home.bindChild(DemoTab.DemoTabs, {
  field: 'demoTabs',
  parentMessage: Message.GotDemoTabsMessage,
  outMessage: { fold: foldDemoTabsOutMessage },
  init: { args: () => Tuple.make({ id: 'demo-tabs' }) },
})

const foldPlaygroundMenuOutMessage = PlaygroundMenu.OutMessage.match<
  Update.StepWithOutMessage<Model, Message, OutMessage>,
  typeof PlaygroundMenu.OutMessage.Type
>({
  Selected:
    ({ value }) =>
    model => ({
      model,
      outMessage: OutMessage.SelectedPlaygroundExample({ exampleSlug: value }),
    }),
})

export const PlaygroundMenuBinding = Home.bindChild(PlaygroundMenu, {
  field: 'playgroundMenu',
  parentMessage: Message.GotPlaygroundMenuMessage,
  outMessage: { fold: foldPlaygroundMenuOutMessage },
  init: {
    args: () => Tuple.make({ id: 'playground-menu', isAnimated: true }),
  },
})

export const AsyncCounterDemoBinding = Home.bindChild(AsyncCounterDemo.block, {
  field: 'asyncCounterDemo',
  parentMessage: Message.GotAsyncCounterDemoMessage,
})

export const NotePlayerDemoBinding = Home.bindChild(NotePlayerDemo.block, {
  field: 'notePlayerDemo',
  parentMessage: Message.GotNotePlayerDemoMessage,
})

export const HomeComposition = Home.makeComposition({
  childBindings: [
    AsyncCounterDemoBinding,
    DemoTabsBinding,
    NotePlayerDemoBinding,
    PlaygroundMenuBinding,
  ],
})
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
