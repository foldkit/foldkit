import { init } from 'foldkit/scene'
import { expect, role, scene, text } from 'foldkit/scene'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { AttachmentsBlock, layer } from './index'

describe('attachments', () => {
  it.effect('renders the resume and additional-files drop zones', () =>
    scene(
      { block: AttachmentsBlock, layer },
      init(),
      expect(role('heading', { name: 'Resume (PDF)' })).toExist(),
      expect(text('Drop your resume or click to upload')).toExist(),
      expect(
        role('heading', { name: 'Additional Files (optional)' }),
      ).toExist(),
    ),
  )
})
