import { Effect } from 'effect'
import { init, messageFrom } from 'foldkit/story'
import { model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { FileDropBlock } from '@foldkit/ui/fileDrop'

import { AttachmentsBlock, layer } from './block'
import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'

type FileDropMessage = typeof FileDropBlock.Message.Type

const resumeDropMessage = (message: FileDropMessage) =>
  messageFrom(ResumeDropBinding, message)

const additionalFilesDropMessage = (message: FileDropMessage) =>
  messageFrom(AdditionalFilesDropBinding, message)

describe('attachments', () => {
  it.effect('a dropped resume is stored as maybeResume', () => {
    const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
      type: 'application/pdf',
    })

    return story(
      AttachmentsBlock,
      init(),
      resumeDropMessage(
        FileDropBlock.Message.DroppedFiles({ files: [resume] }),
      ),
      model(model => {
        expect(model.maybeResume._tag).toBe('Some')
      }),
    ).pipe(Effect.provide(layer))
  })

  it.effect('dropped additional files are appended to the list', () => {
    const file = new globalThis.File(['content'], 'portfolio.pdf', {
      type: 'application/pdf',
    })

    return story(
      AttachmentsBlock,
      init(),
      additionalFilesDropMessage(
        FileDropBlock.Message.DroppedFiles({ files: [file] }),
      ),
      model(model => {
        expect(model.additionalFiles).toHaveLength(1)
      }),
    ).pipe(Effect.provide(layer))
  })
})
