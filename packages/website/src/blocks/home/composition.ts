import type { Block } from 'foldkit'

import { AsyncCounterDemoBlock, NotePlayerDemoBlock } from './blocks'
import {
  HomeBlock,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
} from './definition'
import * as DemoTab from './demoTab'
import { OutMessage } from './message'
import { PlaygroundMenuBlock } from './playgroundMenu'

export const DemoTabsBinding = HomeBlock.makeBinding(DemoTab.DemoTabsBlock, {
  field: 'demoTabs',
  init: { contextToArgs: () => [{ id: 'demo-tabs' }] },
}).withOutMessagePolicy({
  fold: HomeBlock.makeOutMessageFold(DemoTab.DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ activeDemoTab: () => value })),
  }),
})

const foldPlaygroundMenuOutMessage = HomeBlock.makeOutMessageFold(
  PlaygroundMenuBlock,
  {
    Selected: ({ value }) =>
      makeOutMessageStep(() =>
        OutMessage.SelectedPlaygroundExample({
          exampleSlug: value,
        }),
      ),
    Closed: makeNoopStep,
  },
)

export const PlaygroundMenuBinding = HomeBlock.makeBinding(
  PlaygroundMenuBlock,
  {
    field: 'playgroundMenu',
    init: {
      contextToArgs: () => [{ id: 'playground-menu', isAnimated: true }],
    },
  },
).withOutMessagePolicy({ fold: foldPlaygroundMenuOutMessage })

export const AsyncCounterDemoBinding = HomeBlock.makeBinding(
  AsyncCounterDemoBlock,
  {
    field: 'asyncCounterDemo',
  },
)

export const NotePlayerDemoBinding = HomeBlock.makeBinding(
  NotePlayerDemoBlock,
  {
    field: 'notePlayerDemo',
  },
)

export const HomeComposition = HomeBlock.makeComposition({
  bindings: [
    AsyncCounterDemoBinding,
    DemoTabsBinding,
    NotePlayerDemoBinding,
    PlaygroundMenuBinding,
  ],
})
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
