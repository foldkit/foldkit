import { Effect } from 'effect'

import { BlockPageDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const BlockPageBlock = BlockPageDefinition.contract

const block = BlockPageDefinition.makeBlock(
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
