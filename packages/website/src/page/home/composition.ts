import { Tuple } from 'effect'
import type { Block } from 'foldkit'

import { AsyncCounterDemoBlock } from './asyncCounterDemo'
import { HomeDefinition } from './definition'
import * as DemoTab from './demoTab'
import { OutMessage } from './message'
import { NotePlayerDemoBlock } from './notePlayerDemo'
import { PlaygroundMenuBlock } from './playgroundMenu'

export const DemoTabsBinding = HomeDefinition.makeBinding(
  DemoTab.DemoTabsBlock,
  {
    field: 'demoTabs',
    init: { contextToArgs: () => Tuple.make({ id: 'demo-tabs' }) },
  },
).withOutMessagePolicy({
  fold: HomeDefinition.makeOutMessageFold(DemoTab.DemoTabsBlock, {
    Selected: ({ value }) =>
      HomeDefinition.makeFieldsStep(() => ({ activeDemoTab: () => value })),
  }),
})

const foldPlaygroundMenuOutMessage = HomeDefinition.makeOutMessageFold(
  PlaygroundMenuBlock,
  {
    Selected: ({ value }) =>
      HomeDefinition.makeOutMessageStep(() =>
        OutMessage.SelectedPlaygroundExample({
          exampleSlug: value,
        }),
      ),
    Closed: HomeDefinition.makeNoopStep,
  },
)

export const PlaygroundMenuBinding = HomeDefinition.makeBinding(
  PlaygroundMenuBlock,
  {
    field: 'playgroundMenu',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'playground-menu', isAnimated: true }),
    },
  },
).withOutMessagePolicy({ fold: foldPlaygroundMenuOutMessage })

export const AsyncCounterDemoBinding = HomeDefinition.makeBinding(
  AsyncCounterDemoBlock,
  {
    field: 'asyncCounterDemo',
  },
)

export const NotePlayerDemoBinding = HomeDefinition.makeBinding(
  NotePlayerDemoBlock,
  {
    field: 'notePlayerDemo',
  },
)

export const HomeComposition = HomeDefinition.makeComposition({
  bindings: [
    AsyncCounterDemoBinding,
    DemoTabsBinding,
    NotePlayerDemoBinding,
    PlaygroundMenuBinding,
  ],
})
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
