import { Effect, Layer } from 'effect'

import { layer as MenuLayer } from '@foldkit/ui/menu'
import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { HomeBlock } from './block'
import { AsyncCounterDemo, NotePlayerDemo } from './blocks'
import {
  AsyncCounterDemoBinding,
  DemoTabsBinding,
  NotePlayerDemoBinding,
  PlaygroundMenuBinding,
} from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export { view } from './view'

export const layer = HomeBlock.makeLayer(
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
).pipe(
  Layer.provide(
    Layer.mergeAll(
      AsyncCounterDemo.layer,
      NotePlayerDemo.layer,
      TabsLayer,
      MenuLayer,
    ),
  ),
)
