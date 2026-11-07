import { ComingFromReactBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ComingFromReactBlock.makeLayer({
  init,
  update,
  view,
})
