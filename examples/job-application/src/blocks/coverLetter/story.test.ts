import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { CoverLetterBlock, layer } from './block'

describe('coverLetter', () => {
  it.effect('UpdatedContent replaces the letter text', () =>
    Story.story(
      { block: CoverLetterBlock, layer },
      Story.init(),
      Story.message(
        CoverLetterBlock.Message.UpdatedContent({
          value: 'I love the Elm Architecture.',
        }),
      ),
      Story.model(model => {
        expect(model.content).toBe('I love the Elm Architecture.')
      }),
    ),
  )
})
