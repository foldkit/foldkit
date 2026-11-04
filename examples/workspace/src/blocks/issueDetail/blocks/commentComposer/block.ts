import { Effect } from 'effect'

import { EffectsLayer } from './command'
import { CommentComposerBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = CommentComposerBlock.makeLayer(
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

export { CommentComposerBlock } from './definition'
