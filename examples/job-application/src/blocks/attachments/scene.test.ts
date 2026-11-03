import { Effect } from 'effect'
import { init } from 'foldkit/scene'
import { expect, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { AttachmentsBlock, layer } from './block'

describe('attachments', () => {
  test('renders the resume and additional-files drop zones', async () => {
    await Effect.runPromise(
      scene(
        AttachmentsBlock,
        init(),
        expect(role('heading', { name: 'Resume (PDF)' })).toExist(),
        expect(text('Drop your resume or click to upload')).toExist(),
        expect(
          role('heading', { name: 'Additional Files (optional)' }),
        ).toExist(),
      ).pipe(Effect.provide(layer)),
    )
  })
})
