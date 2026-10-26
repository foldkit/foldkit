import { Dom } from 'foldkit'

import { ApplicationDefinition } from '../definition'
import { Message } from '../message'
import { NARROW_VIEWPORT_QUERY } from '../viewport'

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  viewportWidthChanges: entry('ViewportWidthChanges', {
    messages: [Message.ChangedViewportWidth],
    handler: function* () {
      return () =>
        Dom.streamFromMediaQuery({
          query: NARROW_VIEWPORT_QUERY,
          mapMatches: isNarrow => Message.ChangedViewportWidth({ isNarrow }),
        })
    },
  }),
}))
