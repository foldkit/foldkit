import { html } from 'foldkit/html'

const searchView = (model: Model): Html => {
  const h = html<Message>()

  return model.isEditing
    ? h.div(
        [h.Class('editor')],
        [h.input([h.OnInput(text => EditedQuery({ text }))])],
      )
    : h.div([h.Class('summary')], [h.p([], [model.query])])
}
