import { ParentComposition } from '../shared/unified'

export const view = ParentComposition.makeView((_model, h) => h.div([]))
const unrelated = { makeView: callback => callback }
export const foreign = unrelated.makeView((_model, h) => h.div([], []))
