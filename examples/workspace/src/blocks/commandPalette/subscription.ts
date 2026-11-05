import { Dom } from 'foldkit'

import { makeSubscriptions } from './block'
import { Message } from './message'

export const subscriptions = makeSubscriptions(entry => ({
  openShortcut: entry('OpenShortcut', {
    messages: [Message.PressedOpenShortcut],
    handler: function* () {
      return () =>
        Dom.streamFromKeyBindings({
          bindings: [
            {
              keys: 'Mod+K',
              whileTyping: 'Allow',
              mapEvent: () => Message.PressedOpenShortcut(),
            },
          ],
        })
    },
  }),
}))
