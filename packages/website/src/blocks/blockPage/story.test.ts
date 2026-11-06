import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { BlockPageBlock, layer } from './index'
import { Message } from './message'

const blockPageSubject = { block: BlockPageBlock, layer }

describe('Block page', () => {
  it.effect('owns the mapMessages disclosure state', () =>
    Story.story(
      blockPageSubject,
      Story.init(),
      Story.message(Message.ToggledMapMessagesUnderHood({ isOpen: true })),
      Story.model(model => {
        expect(model.isMapMessagesUnderHoodOpen).toBe(true)
      }),
    ),
  )
})
