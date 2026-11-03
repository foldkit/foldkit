import { Effect } from 'effect'

import { ComingFromReactDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ComingFromReactBlock = ComingFromReactDefinition.contract

const block = ComingFromReactDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
export const layer = block.layer
