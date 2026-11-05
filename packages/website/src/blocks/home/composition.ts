import type { Block } from 'foldkit'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeOutMessageStep,
} from './block'
import { AsyncCounterDemoBlock, NotePlayerDemoBlock } from './blocks'
import * as DemoTab from './demoTab'
import { OutMessage } from './message'
import { PlaygroundMenuBlock } from './playgroundMenu'

export const DemoTabsBinding = makeBinding(DemoTab.DemoTabsBlock, {
  field: 'demoTabs',
  init: { contextToArgs: () => [{ id: 'demo-tabs' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DemoTab.DemoTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({ activeDemoTab: () => value })),
  }),
})

const foldPlaygroundMenuOutMessage = makeOutMessageFold(PlaygroundMenuBlock, {
  Selected: ({ value }) =>
    makeOutMessageStep(() =>
      OutMessage.SelectedPlaygroundExample({
        exampleSlug: value,
      }),
    ),
  Closed: makeNoopStep,
})

export const PlaygroundMenuBinding = makeBinding(PlaygroundMenuBlock, {
  field: 'playgroundMenu',
  init: {
    contextToArgs: () => [{ id: 'playground-menu', isAnimated: true }],
  },
}).withOutMessagePolicy({ fold: foldPlaygroundMenuOutMessage })

export const AsyncCounterDemoBinding = makeBinding(AsyncCounterDemoBlock, {
  field: 'asyncCounterDemo',
})

export const NotePlayerDemoBinding = makeBinding(NotePlayerDemoBlock, {
  field: 'notePlayerDemo',
})

export const HomeComposition = makeComposition({
  bindings: [
    AsyncCounterDemoBinding,
    DemoTabsBinding,
    NotePlayerDemoBinding,
    PlaygroundMenuBinding,
  ],
})
export type HomeViewBuilder = Block.ViewBuilderFor<typeof HomeComposition>
