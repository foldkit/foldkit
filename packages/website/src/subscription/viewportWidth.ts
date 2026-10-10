import { Effect } from 'effect'
import { Dom, Subscription } from 'foldkit'

import { Message } from '../message'
import { type Model } from '../model'
import { NARROW_VIEWPORT_QUERY } from '../viewport'

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  viewportWidthChanges: entry(
    'ViewportWidthChanges',
    {
      messages: [Message.ChangedViewportWidth],
    },
    Effect.succeed(() =>
      Dom.streamFromMediaQuery({
        query: NARROW_VIEWPORT_QUERY,
        mapMatches: isNarrow => Message.ChangedViewportWidth({ isNarrow }),
      }),
    ),
  ),
}))

export const EffectsLayer = subscriptions.viewportWidthChanges.layer
