import { Effect } from 'effect'

import { EffectsLayer } from './command.js'
import { AnimationDefinition } from './definition.js'
import { init } from './init.js'
import { inMessageUpdate, update } from './update.js'
import { view } from './view.js'

/** @internal Checked implementation used as an internal testing root. */
export const block = AnimationDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
)

/** Constructs Animation without starting Commands or occurrence lifecycles. */
export const layer = block.layer

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
