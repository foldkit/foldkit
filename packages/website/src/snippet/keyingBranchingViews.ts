import { html } from 'foldkit/html'

const searchView = (model: Model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('search')],
    [model.mode === 'Editing' ? editorView(model) : summaryView(model)],
  )
}
