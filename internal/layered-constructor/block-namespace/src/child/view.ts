import { ChildComposition, type ChildViewBuilder } from './composition.js'

export const renderLabel = (label: string, h: ChildViewBuilder) =>
  h.p([], [label])

export const view = ChildComposition.makeView.withInputs(
  (model, { toLabel }, h) => renderLabel(toLabel(model.count), h),
)
