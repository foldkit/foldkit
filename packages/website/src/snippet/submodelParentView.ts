// main.ts (parent)
import { type Document, html } from 'foldkit/html'

import { GotSettingsMessage, type Message } from './message'
import type { Model } from './model'
import { Settings } from './page'

// The parent embeds the child via h.submodel. The slotId is unique within
// the parent's view, view is the child's exported view function, model is the
// embedded slice, and toParentMessage lifts every Message the child emits
// into the parent's GotSettingsMessage envelope. The child stays decoupled
// from this parent; the same Settings.view embeds under any parent that
// supplies a compatible wrapping.
export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'My App',
    body: h.div(
      [h.Class('min-h-screen bg-gray-50')],
      [
        h.submodel({
          slotId: 'settings',
          model: model.settings,
          view: Settings.view,
          toParentMessage: message => GotSettingsMessage({ message }),
        }),
      ],
    ),
  }
}
