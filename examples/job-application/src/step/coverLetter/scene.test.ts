import { expect, given, label, scene, text, type } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init, update, view } from './coverLetter'

describe('coverLetter', () => {
  test('renders the cover letter field', () => {
    scene(
      { update, view },
      given(init()),
      expect(label('Cover Letter')).toExist(),
      expect(text('2000 characters remaining')).toExist(),
    )
  })

  test('typing updates the remaining character count', () => {
    scene(
      { update, view },
      given(init()),
      type(label('Cover Letter'), 'Hello'),
      expect(text('1995 characters remaining')).toExist(),
    )
  })
})
