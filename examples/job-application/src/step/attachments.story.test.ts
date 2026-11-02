import { Block } from 'foldkit'
import { message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'
import { FileDrop } from '@foldkit/ui'

import { AttachmentsLive } from './attachments'

describe('attachments', () => {
  it.effect('a dropped resume is stored as maybeResume', () => {
    const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
      type: 'application/pdf',
    })

    return story(
      AttachmentsLive,
      message(
        Block.deliver(
          FileDrop.FileDrop,
          'resumeDrop',
          FileDrop.FileDrop.Message.DroppedFiles({ files: [resume] }),
        ),
      ),
      model(model => {
        expect(model.maybeResume._tag).toBe('Some')
      }),
    )
  })

  it.effect('dropped additional files are appended to the list', () => {
    const file = new globalThis.File(['content'], 'portfolio.pdf', {
      type: 'application/pdf',
    })

    return story(
      AttachmentsLive,
      message(
        Block.deliver(
          FileDrop.FileDrop,
          'additionalFilesDrop',
          FileDrop.FileDrop.Message.DroppedFiles({ files: [file] }),
        ),
      ),
      model(model => {
        expect(model.additionalFiles).toHaveLength(1)
      }),
    )
  })
})
