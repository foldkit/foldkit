import { BlockPageBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = BlockPageBlock.makeLayer({
  init,
  update,
  view,
})
