import { EffectsLayer } from './command.js'
import { AnimationBlock } from './definition.js'
import { init } from './init.js'
import { inMessageUpdate, update } from './update.js'
import { view } from './view.js'

/** Constructs the Animation implementation without starting occurrence effects. */
export const layer = AnimationBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})

/** @internal Selected implementation used by component tests. */
export const block = { block: AnimationBlock, layer }

export { AnimationBlock } from './definition.js'
export {
  Model,
  Message,
  InMessage,
  OutMessage,
  TransitionState,
} from './schema.js'
export type { InitConfig } from './schema.js'
export {
  WaitForPaint,
  WaitForAnimationSettled,
  EffectsLayer,
} from './command.js'
export type { ViewInputs } from './types.js'
