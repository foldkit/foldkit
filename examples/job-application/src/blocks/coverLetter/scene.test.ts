import { Effect } from 'effect'
import { init } from 'foldkit/scene'
import { expect, label, scene, text, type } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { CoverLetterBlock, layer } from './block'

describe('coverLetter', () => {
  test('renders the cover letter field', async () => {
    await Effect.runPromise(
      scene(
        CoverLetterBlock,
        init(),
        expect(label('Cover Letter')).toExist(),
        expect(text('2000 characters remaining')).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('typing updates the remaining character count', async () => {
    await Effect.runPromise(
      scene(
        CoverLetterBlock,
        init(),
        type(label('Cover Letter'), 'Hello'),
        expect(text('1995 characters remaining')).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
