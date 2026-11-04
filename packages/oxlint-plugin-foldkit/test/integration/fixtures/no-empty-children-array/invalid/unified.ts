import { ParentComposition, makeView } from '../shared/unified'

export const view = ParentComposition.makeView((_model, h) => h.div([], []))
export const extracted = makeView((_model, h) => h.span([], []))
