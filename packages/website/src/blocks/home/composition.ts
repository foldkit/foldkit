import type { Block } from 'foldkit'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeOutMessageStep,
  makeRequiredFieldBinding,
} from './block'
import { AsyncCounterDemoBlock, NotePlayerDemoBlock } from './blocks'
import * as DemoTab from './demoTab'
import { OutMessage } from './message'
import { PlaygroundMenuBlock } from './playgroundMenu'

export const DemoTabsBinding = makeRequiredFieldBinding(DemoTab.DemoTabsBlock, {
  field: 'demoTabs',
  init: { contextToArgs: () => [{ id: 'demo-tabs' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DemoTab.DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ activeDemoTab: () => value })),
  }),
})

export const PlaygroundMenuBinding = makeRequiredFieldBinding(
  PlaygroundMenuBlock,
  {
    field: 'playgroundMenu',
    init: {
      contextToArgs: () => [{ id: 'playground-menu', isAnimated: true }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PlaygroundMenuBlock, {
    Selected: ({ value }) =>
      makeOutMessageStep(() =>
        OutMessage.SelectedPlaygroundExample({
          exampleSlug: value,
        }),
      ),
    Closed: makeNoopStep,
  }),
})

export const AsyncCounterDemoBinding = makeRequiredFieldBinding(
  AsyncCounterDemoBlock,
  {
    field: 'asyncCounterDemo',
  },
)

export const NotePlayerDemoBinding = makeRequiredFieldBinding(
  NotePlayerDemoBlock,
  {
    field: 'notePlayerDemo',
  },
)

export const HomeComposition = makeComposition({
  bindings: [
    AsyncCounterDemoBinding,
    DemoTabsBinding,
    NotePlayerDemoBinding,
    PlaygroundMenuBinding,
  ],
})
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
