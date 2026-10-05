import { Schema } from 'effect'
import { Runtime, type Update } from 'foldkit'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

export const Message = defineMessageUnion({ ClickedIncrement: {} })
type Message = typeof Message.Type

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({ model: { count: model.count + 1 } }),
  })

const makeCounter = (
  renderBody: (model: Model, h: HtmlBuilder<Message>) => Html,
  devTools?: Runtime.DevToolsConfig,
) => {
  const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: `Counter: ${model.count}`,
    body: renderBody(model, h),
  })

  return Runtime.makeApplication({
    Model,
    init: () => ({ model: { count: 0 } }),
    update,
    view,
    container: document.getElementById('root'),
    ...(devTools === undefined ? {} : { devTools }),
  })
}

export const runCounter = (
  renderBody: (model: Model, h: HtmlBuilder<Message>) => Html,
  devTools?: Runtime.DevToolsConfig,
): void => Runtime.run(makeCounter(renderBody, devTools))

export const hydrateCounter = (
  renderBody: (model: Model, h: HtmlBuilder<Message>) => Html,
): void => Runtime.hydrate(makeCounter(renderBody))
