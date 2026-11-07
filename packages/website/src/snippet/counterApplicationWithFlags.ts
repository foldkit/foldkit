import { ApplicationBlock, init, update, view } from './counterFlagsRoot'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
})

export { ApplicationBlock } from './counterFlagsRoot'
