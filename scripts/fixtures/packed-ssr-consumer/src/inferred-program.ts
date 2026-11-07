import { Effect, Layer, Schema } from 'effect'
import { Block, Program } from 'foldkit'
import type { Document } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ Ticked: {} })
type Message = typeof Message.Type
export const ElementKey = Symbol('InferredElement')
const ElementBlock = Block.make('Application', {
  key: ElementKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ElementComposition = ElementBlock.makeComposition()

const elementInit = ElementComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const elementUpdate = ElementComposition.makeUpdate({
  Ticked: model => ({ model }),
})
const elementView = ElementComposition.makeView((model, h) =>
  h.div([], [String(model.count)]),
)

export const ApplicationKey = Symbol('InferredPage')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const ApplicationComposition = ApplicationBlock.makeComposition()
const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const update = ApplicationComposition.makeUpdate({
  Ticked: model => ({ model }),
})
const applicationView = ApplicationComposition.makeView(
  (model, h): Document => ({
    title: `Count ${model.count}`,
    body: h.div([], [String(model.count)]),
  }),
)

const EffectsLayer = Layer.empty

const elementLayer = ElementBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init: elementInit,
      update: elementUpdate,
      EffectsLayer,
      view: elementView,
    }
  }),
)

const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      EffectsLayer,
      view: applicationView,
    }
  }),
)

export const makeInferredElement = (container: HTMLElement) =>
  Program.makeElement({
    block: ElementBlock,
    layer: elementLayer,
    container,
  })

export const makeInferredApplication = (container: HTMLElement | null) =>
  Program.make({
    block: ApplicationBlock,
    layer,
    container,
  })
