import { UiComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const UiBlock = UiComposition.implement({
  init,
  update,
  view,
}).assembleBlock()
