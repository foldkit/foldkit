import { Effect } from 'effect'

import { MessageComposerDefinition } from './definition'
import { Message } from './message'

export const FocusInput = MessageComposerDefinition.makeMount('FocusInput', {
  messages: [Message.CompletedFocusInput],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() => {
        if (element instanceof HTMLElement) {
          element.focus({ preventScroll: true })
        }

        return Message.CompletedFocusInput()
      })
  },
})
