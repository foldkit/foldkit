import { PanelComposition } from './composition'
import { init } from './init'
import { MeasurePanel } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasurePanel.layer

export const block = PanelComposition.makeBlock({
  init,
  update,
  view,
  EffectsLayer,
})
