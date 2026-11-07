import { PanelBlock } from './block'
import { init } from './init'
import { MeasurePanel } from './mount'
import { update } from './update'
import { view } from './view'

export const EffectsLayer = MeasurePanel.layer

export const layer = PanelBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer,
})
