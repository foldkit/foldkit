import { message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { BlockPageLive } from './block'
import { Message } from './message'

describe('Block page', () => {
  it.effect('owns the message routing disclosure state', () =>
    story(
      BlockPageLive,
      message(Message.ToggledMessageRoutingUnderHood({ isOpen: true })),
      model(model => {
        expect(model.isMessageRoutingUnderHoodOpen).toBe(true)
      }),
    ),
  )
})
