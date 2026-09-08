import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { init } from './init'
import { Message } from './message'
import { update } from './update'

describe('Submodel page', () => {
  test('owns the mapMessages disclosure state', () => {
    story(
      update,
      given(init().model),
      message(Message.ToggledMapMessagesUnderHood({ isOpen: true })),
      model(model => {
        expect(model.isMapMessagesUnderHoodOpen).toBe(true)
      }),
    )
  })
})
