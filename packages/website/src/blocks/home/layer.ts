import { Effect, Layer } from 'effect'

import { Menu, Tabs } from '@foldkit/ui'

import { HomeBlock } from './block'
import { AsyncCounterDemo, NotePlayerDemo } from './blocks'
import { HomeComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export { view } from './view'

export const layer = HomeBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* HomeComposition.acquireChildren()

    return {
      children,
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
      Tabs.layer,
      Menu.layer,
    ),
  ),
)
