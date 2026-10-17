import { Layer, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import type { Document } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ Ticked: {} })
const Application = defineApplication({ Model, Message })

const ApplicationComposition = Application.makeComposition()

const init = () => ({ model: Model.make({ count: 0 }) })
const update = ApplicationComposition.makeUpdate(model => ({ model }))
const elementView = ApplicationComposition.makeView((model, h) =>
  h.div([], [String(model.count)]),
)
const applicationView = ApplicationComposition.makeView(
  (model, h): Document => ({
    title: `Count ${model.count}`,
    body: h.div([], [String(model.count)]),
  }),
)

const EffectsLayer = Layer.empty

export const makeInferredElement = (container: HTMLElement) =>
  ApplicationComposition.makeElement({
    init,
    update,
    EffectsLayer,
    view: elementView,
    container,
  })

export const makeInferredApplication = (container: HTMLElement | null) =>
  ApplicationComposition.makeApplication({
    init,
    update,
    EffectsLayer,
    view: applicationView,
    container,
  })
