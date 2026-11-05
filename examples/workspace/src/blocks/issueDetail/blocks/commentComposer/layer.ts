import { Effect } from 'effect'

import { CommentComposerBlock } from './block'
import { AddComment } from './command'
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
      EffectsLayer: AddComment.layer,
    }
  }),
)
