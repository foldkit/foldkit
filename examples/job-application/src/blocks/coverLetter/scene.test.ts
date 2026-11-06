import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { CoverLetterBlock, layer } from './block'

describe('coverLetter', () => {
  it.effect('renders the cover letter field', () =>
    Scene.scene(
      { block: CoverLetterBlock, layer },
      Scene.init(),
      Scene.expect(Scene.label('Cover Letter')).toExist(),
      Scene.expect(Scene.text('2000 characters remaining')).toExist(),
    ),
  )

  it.effect('typing updates the remaining character count', () =>
    Scene.scene(
      { block: CoverLetterBlock, layer },
      Scene.init(),
      Scene.type(Scene.label('Cover Letter'), 'Hello'),
      Scene.expect(Scene.text('1995 characters remaining')).toExist(),
    ),
  )
})
