import { Dom, Subscription } from 'foldkit'

import { Message } from '../message'
import { type Model } from '../model'
import { NARROW_VIEWPORT_QUERY } from '../viewport'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  viewportWidth: entry('ViewportWidthChanges', {
    messages: [Message.ChangedViewportWidth],
  }),
}))

export const ViewportWidthChangesLayer = subscriptions.viewportWidth.toLayer(
  () =>
    Dom.streamFromMediaQuery({
      query: NARROW_VIEWPORT_QUERY,
      mapMatches: isNarrow => Message.ChangedViewportWidth({ isNarrow }),
    }),
)

export { ViewportWidthChangesLayer as Layer }
