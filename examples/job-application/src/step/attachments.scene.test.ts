import { expect, role, scene, text } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { AttachmentsLive } from './attachments'

describe('attachments', () => {
  it.effect('renders the resume and additional-files drop zones', () =>
    scene(
      AttachmentsLive,
      expect(role('heading', { name: 'Resume (PDF)' })).toExist(),
      expect(text('Drop your resume or click to upload')).toExist(),
      expect(
        role('heading', { name: 'Additional Files (optional)' }),
      ).toExist(),
    ),
  )
})
