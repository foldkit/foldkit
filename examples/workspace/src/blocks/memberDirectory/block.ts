import { Effect } from 'effect'

import { MemberDirectoryDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const block = MemberDirectoryDefinition.makeBlock(
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
