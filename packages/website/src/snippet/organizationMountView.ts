import { PanelComposition } from './composition'
import { MeasurePanel } from './mount'

export const view = PanelComposition.makeView((model, h) =>
  h.div([h.OnMount(MeasurePanel())], [model.label]),
)
