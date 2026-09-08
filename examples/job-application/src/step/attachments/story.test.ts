import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { FileDrop } from '@foldkit/ui'

import { Message, init, update } from './attachments'

describe('attachments', () => {
  test('a dropped resume is stored as maybeResume', () => {
    const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
      type: 'application/pdf',
    })

    story(
      update,
      given(init()),
      message(
        Message.GotResumeDropMessage({
          message: FileDrop.Message.DroppedFiles({ files: [resume] }),
        }),
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
      given(init()),
      message(
        Message.GotAdditionalFilesDropMessage({
          message: FileDrop.Message.DroppedFiles({ files: [file] }),
        }),
      ),
      model(model => {
        expect(model.additionalFiles).toHaveLength(1)
      }),
    )
  })
})
