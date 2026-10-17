import { Panel } from './definition'
import { MeasurePanel } from './mount'

export const PanelComposition = Panel.makeComposition({
  mounts: [MeasurePanel],
})
