import { Effect } from 'effect'

import { LoggedInBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = LoggedInBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
