import { expect, label, scene, text, type } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { CoverLetterLive } from './coverLetter'

describe('coverLetter', () => {
  it.effect('renders the cover letter field', () =>
    scene(
      CoverLetterLive,
      expect(label('Cover Letter')).toExist(),
      expect(text('2000 characters remaining')).toExist(),
    ),
  )

  it.effect('typing updates the remaining character count', () =>
    scene(
      CoverLetterLive,
      type(label('Cover Letter'), 'Hello'),
      expect(text('1995 characters remaining')).toExist(),
    ),
  )
})
