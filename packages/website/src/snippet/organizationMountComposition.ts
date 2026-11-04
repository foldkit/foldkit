import { PanelBlock } from './definition'
import { MeasurePanel } from './mount'

export const PanelComposition = PanelBlock.makeComposition({
  mounts: [MeasurePanel],
})
