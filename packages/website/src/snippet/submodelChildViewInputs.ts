// page/collapsible.ts
import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { type Message, ToggledOpen } from './message'
import type { Model } from './model'

// The third type parameter to defineView is `ViewInputs`: per-render
// data the parent passes alongside the model. Here, the parent supplies
// the summary and content Html; the child supplies the open/closed
// behavior.
export type ViewInputs = Readonly<{
  summary: Html
  content: Html
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    return h.div(
      [h.Class('flex flex-col gap-2')],
      [
        h.button([h.OnClick(ToggledOpen())], [viewInputs.summary]),
        model.isOpen ? h.div([h.Class('pl-4')], [viewInputs.content]) : h.empty,
      ],
    )
  },
)
