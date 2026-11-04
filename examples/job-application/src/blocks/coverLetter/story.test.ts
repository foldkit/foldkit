import { init } from 'foldkit/story'
import { message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { CoverLetterBlock, layer } from './block'

describe('coverLetter', () => {
  it.effect('UpdatedContent replaces the letter text', () =>
    story(
      { block: CoverLetterBlock, layer },
      init(),
      message(
        CoverLetterBlock.Message.UpdatedContent({
          value: 'I love the Elm Architecture.',
        }),
      ),
      model(model => {
        expect(model.content).toBe('I love the Elm Architecture.')
      }),
    ),
  )
})
