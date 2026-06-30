import { Subscription } from 'foldkit'

import { type Model, NARROW_VIEWPORT_QUERY } from '../main'
import { ChangedViewportWidth, type Message } from '../message'

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  viewportWidth: Subscription.persistent(
    Subscription.fromEvent<
      MediaQueryListEvent,
      typeof ChangedViewportWidth.Type
    >({
      target: () => window.matchMedia(NARROW_VIEWPORT_QUERY),
      type: 'change',
      toMessage: event => ChangedViewportWidth({ isNarrow: event.matches }),
    }),
  ),
}))
