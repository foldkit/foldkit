import { Effect } from 'effect'

import { EffectsLayer } from './command'
import { CommentComposerDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const block = CommentComposerDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
)

export const layer = block.layer
