import type { UiContract, UiImplementation } from './block.contract'
import { UiComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const assembled = UiComposition.assembleAs<UiImplementation>()({
  init,
  update,
  view,
})

export const UiBlock: UiContract = assembled
export type AssembledUi = typeof assembled
