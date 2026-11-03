import { Effect } from 'effect'

import { FocusTab } from './command.js'
import { TabsDefinition } from './definition.js'
import { init } from './init.js'
import { update } from './update.js'
import { view } from './view.js'

/** @internal Checked canonical Tabs implementation for internal tests. */
export const block = TabsDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer: FocusTab.layer,
    }
  }),
)

/** Constructs the shared implementation used by every type-only Tabs specialization. */
export const layer = block.layer
