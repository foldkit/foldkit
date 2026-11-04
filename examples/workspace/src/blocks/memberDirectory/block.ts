import { Effect } from 'effect'

import { MemberDirectoryBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = MemberDirectoryBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)

export { MemberDirectoryBlock } from './definition'
