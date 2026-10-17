import { UiComposition } from './composition'
import { init } from './init'
import { closeMobileMenu, openMobileMenu, update } from './update'

export const block = UiComposition.makeBlock({
  init,
  update,
  expose: { openMobileMenu, closeMobileMenu },
})
