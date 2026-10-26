import { given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { FileDropBlock } from '@foldkit/ui'

import { AdditionalFilesDropBinding, ResumeDropBinding } from './composition'
import { init } from './init'
import { update } from './update'

const initialModel = init().model

const resumeDropMessage = (message: typeof FileDropBlock.Message.Type) =>
  toParentMessage(ResumeDropBinding, message)

const additionalFilesDropMessage = (
  message: typeof FileDropBlock.Message.Type,
) => toParentMessage(AdditionalFilesDropBinding, message)

describe('attachments', () => {
  test('a dropped resume is stored as maybeResume', () => {
    const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
      type: 'application/pdf',
    })

    story(
      update,
      given(initialModel),
      message(
        resumeDropMessage(
          FileDropBlock.Message.DroppedFiles({ files: [resume] }),
        ),
      ),
      model(model => {
        expect(model.maybeResume._tag).toBe('Some')
      }),
    )
  })

  test('dropped additional files are appended to the list', () => {
    const file = new globalThis.File(['content'], 'portfolio.pdf', {
      type: 'application/pdf',
    })

    story(
      update,
      given(initialModel),
      message(
        additionalFilesDropMessage(
          FileDropBlock.Message.DroppedFiles({ files: [file] }),
        ),
      ),
      model(model => {
        expect(model.additionalFiles).toHaveLength(1)
      }),
    )
  })
})
