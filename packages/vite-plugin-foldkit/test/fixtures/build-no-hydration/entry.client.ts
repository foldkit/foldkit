import { Schema } from 'effect'
import { Runtime, type Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({})
type Message = typeof Message.Type

const application = Runtime.makeApplication({
  Model,
  init: (): Update.Return<Model, Message> => ({ model: { count: 0 } }),
  update: (model): Update.Return<Model, Message> => ({ model }),
  view: (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: 'Client only',
    body: h.main([], [model.count.toString()]),
  }),
  container: document.getElementById('root'),
})

Runtime.run(application)
