import { init } from 'foldkit/scene'
import { expect, label, scene, text, type } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { CoverLetterBlock, layer } from './block'

describe('coverLetter', () => {
  it.effect('renders the cover letter field', () =>
    scene(
      { block: CoverLetterBlock, layer },
      init(),
      expect(label('Cover Letter')).toExist(),
      expect(text('2000 characters remaining')).toExist(),
    ),
  )

  it.effect('typing updates the remaining character count', () =>
    scene(
      { block: CoverLetterBlock, layer },
      init(),
      type(label('Cover Letter'), 'Hello'),
      expect(text('1995 characters remaining')).toExist(),
    ),
  )
})
