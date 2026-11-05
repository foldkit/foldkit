import { Effect } from 'effect'

import { BlockPageBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = BlockPageBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
