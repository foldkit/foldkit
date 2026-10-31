import { message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { CoverLetter, CoverLetterLive } from './coverLetter'

describe('coverLetter', () => {
  it.effect('UpdatedContent replaces the letter text', () =>
    story(
      CoverLetterLive,
      message(
        CoverLetter.Message.UpdatedContent({
          value: 'I love the Elm Architecture.',
        }),
      ),
      model(model => {
        expect(model.content).toBe('I love the Elm Architecture.')
      }),
    ),
  )
})
