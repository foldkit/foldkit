import { Document, html } from 'foldkit/html'

import { ClickedIncrement, Message } from './message'
import { Model } from './model'

const h = html<Message>()

// ✅ View is a pure function from Model to a Document describing the page
const view = (model: Model): Document => ({
  title: model.title,
  body: h.div(
    [h.Class('container')],
    [
      h.h1([], [model.title]),
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(ClickedIncrement())], ['+']),
    ],
  ),
})
