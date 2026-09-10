import type { Html, HtmlBuilder } from 'foldkit/html'

const searchView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('search')],
    [model.mode === 'Editing' ? editorView(model, h) : summaryView(model, h)],
  )
