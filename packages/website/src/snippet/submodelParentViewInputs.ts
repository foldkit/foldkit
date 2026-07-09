// main.ts (parent)
import { type Document, html } from 'foldkit/html'

import { GotCommandMenuMessage, type Message } from './message'
import type { Model } from './model'
import * as CommandMenu from './page/commandMenu'

const MENU_ITEMS: ReadonlyArray<string> = ['Open', 'Rename', 'Archive']

// The parent passes `viewInputs` alongside model/view/toParentMessage.
// `buttonLabel` and `items` are configuration the parent owns; the child
// slots them into its open/closed widget. The child has no idea what the
// items mean. Only that they exist.
export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: 'My App',
    body: h.div(
      [],
      [
        h.submodel({
          slotId: 'command-menu',
          model: model.commandMenu,
          view: CommandMenu.view,
          viewInputs: {
            buttonLabel: h.span([], ['Actions']),
            items: MENU_ITEMS,
          },
          toParentMessage: message => GotCommandMenuMessage({ message }),
        }),
      ],
    ),
  }
}
