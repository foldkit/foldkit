import { Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import type { Document } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ Ticked: {} })
const ApplicationComposition = Block.makeDefinition('Application', {
  Model,
  Message,
}).makeComposition()

const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const update = ApplicationComposition.makeUpdate({
  Ticked: model => ({ model }),
})
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

const prepareElement = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    EffectsLayer,
    view: elementView,
  })
const ElementBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareElement
> = Block.assemble(prepareElement)

const prepareApplication = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    EffectsLayer,
    view: applicationView,
  })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareApplication
> = Block.assemble(prepareApplication)

export const makeInferredElement = (container: HTMLElement) =>
  Program.makeElement({
    block: ElementBlock,
    container,
  })

export const makeInferredApplication = (container: HTMLElement | null) =>
  Program.make({
    block: ApplicationBlock,
    container,
  })
