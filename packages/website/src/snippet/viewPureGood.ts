import type { Document, HtmlBuilder } from 'foldkit/html'

import { ClickedIncrement, type Message } from './message'
import type { Model } from './model'

// ✅ Keep view pure
const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
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
