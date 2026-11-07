import { CommentComposerBlock } from './block'
import { AddComment } from './command'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = CommentComposerBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: AddComment.layer,
})
