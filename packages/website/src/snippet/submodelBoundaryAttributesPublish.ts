// Inside the Submodel's view, running in the child's boundary. Each
// attribute group is wrapped in `boundaryAttributes` so the child's
// dispatcher is captured at publish time. The consumer can spread
// these onto whatever elements they want without losing the wiring
// back through the Submodel's `toParentMessage`.
import { Submodel } from 'foldkit'
import {
  type BoundaryAttribute,
  boundaryAttributes,
  html,
} from 'foldkit/html'

import { Toggled, type Message } from './message'
import { buttonId, panelId, type Model } from './model'

type ViewInputs = Readonly<{
  toView: (attributes: {
    readonly button: ReadonlyArray<BoundaryAttribute>
    readonly panel: ReadonlyArray<BoundaryAttribute>
  }) => unknown
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, inputs) => {
    const h = html<Message>()

    return inputs.toView({
      button: boundaryAttributes([
        h.OnClick(Toggled()),
        h.AriaExpanded(model.isOpen),
        h.Id(buttonId(model.id)),
      ]),
      panel: boundaryAttributes([h.Id(panelId(model.id))]),
    })
  },
)
