import { makeComposition } from './block'
import { MeasurePanel } from './mount'

export const PanelComposition = makeComposition({
  mounts: [MeasurePanel],
})
