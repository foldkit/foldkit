import { Effect } from 'effect'

import { ComingFromReactBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ComingFromReactBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
