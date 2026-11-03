import { Effect } from 'effect'
import { init, messageFrom } from 'foldkit/story'
import { model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { FileDropBlock } from '@foldkit/ui/fileDrop'

import { AttachmentsBlock, layer } from './block'
import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'

type FileDropMessage = typeof FileDropBlock.Message.Type

const resumeDropMessage = (message: FileDropMessage) =>
  messageFrom(ResumeDropBinding, message)

const additionalFilesDropMessage = (message: FileDropMessage) =>
  messageFrom(AdditionalFilesDropBinding, message)

describe('attachments', () => {
  test('a dropped resume is stored as maybeResume', async () => {
    const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
      type: 'application/pdf',
    })

    await Effect.runPromise(
      story(
        AttachmentsBlock,
        init(),
        resumeDropMessage(
          FileDropBlock.Message.DroppedFiles({ files: [resume] }),
        ),
        model(model => {
          expect(model.maybeResume._tag).toBe('Some')
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  test('dropped additional files are appended to the list', async () => {
    const file = new globalThis.File(['content'], 'portfolio.pdf', {
      type: 'application/pdf',
    })

    await Effect.runPromise(
      story(
        AttachmentsBlock,
        init(),
        additionalFilesDropMessage(
          FileDropBlock.Message.DroppedFiles({ files: [file] }),
        ),
        model(model => {
          expect(model.additionalFiles).toHaveLength(1)
        }),
      ).pipe(Effect.provide(layer)),
    )
  })
})
