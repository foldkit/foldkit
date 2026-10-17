import { UiComposition } from './composition'
import { init } from './init'
import { update } from './update'

export const block = UiComposition.makeBlock({
  init,
  update,
})
