import { SnippetCopyBlock } from './block'
import { init } from './init'
import { EffectsLayer, update } from './update'
import { view } from './view'

export const layer = SnippetCopyBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer,
})
