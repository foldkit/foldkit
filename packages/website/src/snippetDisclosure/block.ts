import { SnippetDisclosureComposition } from './composition'
import { init } from './init'
import { MeasureSnippetHeight } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasureSnippetHeight.layer

export const block = SnippetDisclosureComposition.makeBlock({
  init,
  update,
  view,
  EffectsLayer,
})
