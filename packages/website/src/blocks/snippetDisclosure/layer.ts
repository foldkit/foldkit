import { SnippetDisclosureBlock } from './block'
import { init } from './init'
import { MeasureSnippetHeight } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasureSnippetHeight.layer

export const layer = SnippetDisclosureBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer,
})
