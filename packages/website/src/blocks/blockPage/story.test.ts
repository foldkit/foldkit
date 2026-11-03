import { Effect } from 'effect'
import { init, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { BlockPageBlock, layer } from './block'
import { Message } from './message'

describe('Block page', () => {
  it.effect('owns the mapMessages disclosure state', () =>
    story(
      BlockPageBlock,
      init(),
      message(Message.ToggledMapMessagesUnderHood({ isOpen: true })),
      model(model => {
        expect(model.isMapMessagesUnderHoodOpen).toBe(true)
      }),
    ).pipe(Effect.provide(layer)),
  )
})
