// main.ts (parent)
import { type Document, html } from 'foldkit/html'

import { GotSettingsMessage, type Message } from './message'
import type { Model } from './model'
import * as Settings from './page/settings'

const h = html<Message>()

// The parent calls the child's view with its own Message type as the
// type argument, plus a toParentMessage callback that wraps every
// child Message in the parent's GotSettingsMessage envelope. The child
// stays decoupled from this parent; the same Settings.view could be
// embedded under any parent that supplies the same wrapping.
export const view = (model: Model): Document => ({
  title: 'My App',
  body: h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      Settings.view<Message>(model.settings, message =>
        GotSettingsMessage({ message }),
      ),
    ],
  ),
})
