import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { FileDrop } from '@foldkit/ui'

import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'
import { AttachmentsBlock, layer } from './index'

type FileDropMessage = typeof FileDrop.FileDropBlock.Message.Type

const resumeDropMessage = (message: FileDropMessage) =>
  Story.messageIn(ResumeDropBinding, message)

const additionalFilesDropMessage = (message: FileDropMessage) =>
  Story.messageIn(AdditionalFilesDropBinding, message)

describe('attachments', () => {
  it.effect('a dropped resume is stored as maybeResume', () => {
    const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
      type: 'application/pdf',
    })

    return Story.story(
      { block: AttachmentsBlock, layer },
      Story.init(),
      resumeDropMessage(
        FileDrop.FileDropBlock.Message.DroppedFiles({ files: [resume] }),
      ),
      Story.model(model => {
        expect(model.maybeResume._tag).toBe('Some')
      }),
    )
  })

  it.effect('dropped additional files are appended to the list', () => {
    const file = new globalThis.File(['content'], 'portfolio.pdf', {
      type: 'application/pdf',
    })

    return Story.story(
      { block: AttachmentsBlock, layer },
      Story.init(),
      additionalFilesDropMessage(
        FileDrop.FileDropBlock.Message.DroppedFiles({ files: [file] }),
      ),
      Story.model(model => {
        expect(model.additionalFiles).toHaveLength(1)
      }),
    )
  })
})
