import { Schema as S } from 'effect'
import { Runtime, type Update } from 'foldkit'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const InferredModel = S.Struct({ count: S.Number })
type InferredModel = typeof InferredModel.Type

const Message = defineMessageUnion({ Ticked: {} })
type InferredMessage = typeof Message.Type

type InferredStep = Update.Return<InferredModel, InferredMessage>

const init = (): InferredStep => ({ model: { count: 0 } })

const update = (model: InferredModel): InferredStep => ({ model })

const elementView = (
  model: InferredModel,
  h: HtmlBuilder<InferredMessage>,
): Html => h.div([], [String(model.count)])

const applicationView = (
  model: InferredModel,
  h: HtmlBuilder<InferredMessage>,
): Document => ({
  title: `Count ${model.count}`,
  body: h.div([], [String(model.count)]),
})

export const makeInferredElement = (container: HTMLElement) =>
  Runtime.makeElement({
    Model: InferredModel,
    init,
    update,
    view: elementView,
    container,
  })

export const makeInferredApplication = (container: HTMLElement | null) =>
  Runtime.makeApplication({
    Model: InferredModel,
    init,
    update,
    view: applicationView,
    container,
  })
