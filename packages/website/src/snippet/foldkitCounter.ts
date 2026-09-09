import { Schema } from 'effect'
import { type Update } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL - Your entire application state

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type

// MESSAGE - Events that can happen in your app

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

// UPDATE - How Messages change the Model

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
  })

// VIEW - A pure function from Model to a Document

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
    ],
  ),
})
