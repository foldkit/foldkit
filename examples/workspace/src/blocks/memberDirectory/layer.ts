import { MemberDirectoryBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = MemberDirectoryBlock.makeLayer({
  init,
  update,
  view,
})
