// main.ts (parent)
import { type Document, html } from 'foldkit/html'

import { GotCollapsibleMessage, type Message } from './message'
import type { Model } from './model'
import { Collapsible } from './page'

// The parent passes `viewInputs` alongside model/view/toParentMessage.
// `summary` and `content` are Html the parent builds; the child slots
// them into its open/closed widget. The child has no idea what the
// summary or content actually are. Only that they exist.
export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'My App',
    body: h.div(
      [],
      [
        h.submodel({
          slotId: 'about-section',
          model: model.about,
          view: Collapsible.view,
          viewInputs: {
            summary: h.span([], ['About this app']),
            content: h.p(
              [],
              ['Built with Foldkit. The architecture is a single loop.'],
            ),
          },
          toParentMessage: message => GotCollapsibleMessage({ message }),
        }),
      ],
    ),
  }
}
