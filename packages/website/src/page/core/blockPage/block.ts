import { BlockPageComposition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const block = BlockPageComposition.makeBlock({
  init,
  update,
  view,
})
