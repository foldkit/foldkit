import { Effect } from 'effect'
import { init } from 'foldkit/story'
import { message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { CoverLetterBlock, layer } from './block'

describe('coverLetter', () => {
  test('UpdatedContent replaces the letter text', async () => {
    await Effect.runPromise(
      story(
        CoverLetterBlock,
        init(),
        message(
          CoverLetterBlock.Message.UpdatedContent({
            value: 'I love the Elm Architecture.',
          }),
        ),
        model(model => {
          expect(model.content).toBe('I love the Elm Architecture.')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })
})
