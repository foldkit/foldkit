import { Effect, Layer } from 'effect'

import { Menu, Tabs } from '@foldkit/ui'

import * as AsyncCounterDemo from './asyncCounterDemo'
import {
  AsyncCounterDemoBinding,
  DemoTabsBinding,
  NotePlayerDemoBinding,
  PlaygroundMenuBinding,
} from './composition'
import { HomeDefinition } from './definition'
import { init } from './init'
import * as NotePlayerDemo from './notePlayerDemo'
import { update } from './update'
import { view } from './view'

export { view } from './view'

export const HomeBlock = HomeDefinition.contract

const block = HomeDefinition.makeBlock(
  Effect.gen(function* () {
    const asyncCounterDemo = yield* AsyncCounterDemoBinding
    const demoTabs = yield* DemoTabsBinding
    const notePlayerDemo = yield* NotePlayerDemoBinding
    const playgroundMenu = yield* PlaygroundMenuBinding

    return {
      children: [asyncCounterDemo, demoTabs, notePlayerDemo, playgroundMenu],
      init,
      update,
      view,
    }
  }),
).provide(
  Layer.mergeAll(
    AsyncCounterDemo.layer,
    NotePlayerDemo.layer,
    Tabs.layer,
    Menu.layer,
  ),
)
export const layer = block.layer
