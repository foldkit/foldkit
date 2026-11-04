import { Dom } from 'foldkit'

import { ApplicationBlock } from './definition'
import { Message } from './message'

export const subscriptions = ApplicationBlock.makeSubscriptions(entry => ({
  navigationShortcutPresses: entry('NavigationShortcutPresses', {
    messages: [Message.EnteredNavigationShortcut],
    handler: function* () {
      return () =>
        Dom.streamFromKeyBindings({
          bindings: [
            {
              keys: ['G', 'H'],
              mapEvent: () =>
                Message.EnteredNavigationShortcut({ shortcut: 'GH' }),
            },
            {
              keys: ['G', 'P'],
              mapEvent: () =>
                Message.EnteredNavigationShortcut({ shortcut: 'GP' }),
            },
            {
              keys: ['G', 'F'],
              mapEvent: () =>
                Message.EnteredNavigationShortcut({ shortcut: 'GF' }),
            },
            {
              keys: ['G', 'N'],
              mapEvent: () =>
                Message.EnteredNavigationShortcut({ shortcut: 'GN' }),
            },
          ],
        })
    },
  }),
}))
