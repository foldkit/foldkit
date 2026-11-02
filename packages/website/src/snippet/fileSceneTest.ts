import { Effect } from 'effect'
import {
  Command,
  changeFiles,
  click,
  dropFiles,
  expect,
  given,
  label,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { ApplicationBlock } from './application'

describe('resume upload flow', () => {
  const resume = new File(['%PDF-'], 'resume.pdf', {
    type: 'application/pdf',
  })

  test('inline file input: changeFiles simulates selection', async () => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        changeFiles(label('resume'), [resume]),
        expect(text('resume.pdf')).toExist(),
      ),
    )
  })

  test('button-triggered picker: resolve the SelectResume Command', async () => {
    const previewDataUrl = 'data:application/pdf;base64,JVBERi0='

    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        click(role('button', { name: 'Choose resume' })),
        Command.resolveAll(
          [SelectResume, CompletedSelectResume({ file: resume })],
          [
            ReadResumePreview,
            SucceededReadPreview({ dataUrl: previewDataUrl }),
          ],
        ),
        expect(role('img', { name: 'Resume preview' })).toExist(),
      ),
    )
  })

  test('drop zone: dropFiles simulates a drag-and-drop', async () => {
    const coverLetter = new File(['cover'], 'cover.txt', {
      type: 'text/plain',
    })
    const portfolio = new File(['<svg/>'], 'portfolio.svg', {
      type: 'image/svg+xml',
    })

    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        dropFiles(label('attachments'), [coverLetter, portfolio]),
        expect(text('2 attachments selected')).toExist(),
      ),
    )
  })
})
