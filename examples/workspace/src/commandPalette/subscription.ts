import { Dom } from 'foldkit'

import { CommandPaletteDefinition } from './definition'
import { Message } from './message'

export const subscriptions = CommandPaletteDefinition.makeSubscriptions(
  entry => ({
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
  }),
)
