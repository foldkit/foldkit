import { LoggedInBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = LoggedInBlock.makeLayer({
  init,
  update,
  view,
})
