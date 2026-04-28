import { Document, html } from 'foldkit/html'

import { ClickedIncrement, Message } from './message'
import { Model } from './model'

const { button, div, h1, p, Class, OnClick } = html<Message>()

// ✅ View is a pure function from Model to a Document describing the page
const view = (model: Model): Document => ({
  title: model.title,
  body: div(
    [Class('container')],
    [
      h1([], [model.title]),
      p([], [`Count: ${model.count}`]),
      button([OnClick(ClickedIncrement())], ['+']),
    ],
  ),
})
