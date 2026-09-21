import { Subscription } from 'foldkit'

import { Message } from '../message'
import { type Model } from '../model'
import { NARROW_VIEWPORT_QUERY } from '../viewport'

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  viewportWidth: Subscription.persistent(
    Subscription.fromMediaQuery({
      query: NARROW_VIEWPORT_QUERY,
      mapMatches: isNarrow => Message.ChangedViewportWidth({ isNarrow }),
    }),
  ),
}))
