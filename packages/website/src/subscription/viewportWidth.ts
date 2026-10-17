import { Dom } from 'foldkit'

import { Application } from '../definition'
import { Message } from '../message'
import { NARROW_VIEWPORT_QUERY } from '../viewport'

export const subscriptions = Application.subscriptions(entry => ({
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

export const EffectsLayer = subscriptions.viewportWidthChanges.layer
