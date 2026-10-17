import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { init } from './init'
import { update } from './update'
import { view } from './view'

describe('attachments', () => {
  test('renders the resume and additional-files drop zones', () => {
    scene(
      { update, view },
      given(init()),
      expect(role('heading', { name: 'Resume (PDF)' })).toExist(),
      expect(text('Drop your resume or click to upload')).toExist(),
      expect(
        role('heading', { name: 'Additional Files (optional)' }),
      ).toExist(),
    )
  })
})
