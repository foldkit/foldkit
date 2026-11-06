import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { AttachmentsBlock, layer } from './index'

describe('attachments', () => {
  it.effect('renders the resume and additional-files drop zones', () =>
    Scene.scene(
      { block: AttachmentsBlock, layer },
      Scene.init(),
      Scene.expect(Scene.role('heading', { name: 'Resume (PDF)' })).toExist(),
      Scene.expect(Scene.text('Drop your resume or click to upload')).toExist(),
      Scene.expect(
        Scene.role('heading', { name: 'Additional Files (optional)' }),
      ).toExist(),
    ),
  )
})
