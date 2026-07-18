import { html } from 'foldkit/html'

const noteView = (model: Model): Html => {
  const h = html<Message>()

  const draftTextarea = h.textarea(
    [h.Key('draft'), h.OnInput(text => EditedDraft({ text }))],
    [],
  )

  return model.isExpanded
    ? h.div(
        [h.Key('note'), h.Class('expanded-layout')],
        [toolbarView(model), draftTextarea],
      )
    : h.div([h.Key('note'), h.Class('compact-layout')], [draftTextarea])
}
