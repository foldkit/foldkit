import { Effect } from 'effect'

import { ApplicationBlock, init, update, view } from './counterFlagsRoot'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)

export { ApplicationBlock } from './counterFlagsRoot'
