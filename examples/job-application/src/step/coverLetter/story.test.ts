import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, init, update } from './coverLetter'

describe('coverLetter', () => {
  test('UpdatedContent replaces the letter text', () => {
    story(
      update,
      given(init()),
      message(
        Message.UpdatedContent({ value: 'I love the Elm Architecture.' }),
      ),
      model(model => {
        expect(model.content).toBe('I love the Elm Architecture.')
      }),
    )
  })
})
