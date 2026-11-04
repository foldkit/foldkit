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
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './application'

describe('resume upload flow', () => {
  const resume = new File(['%PDF-'], 'resume.pdf', {
    type: 'application/pdf',
  })

  it.effect('inline file input: changeFiles simulates selection', () =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      changeFiles(label('resume'), [resume]),
      expect(text('resume.pdf')).toExist(),
    ),
  )

  it.effect('button-triggered picker: resolve the SelectResume Command', () => {
    const previewDataUrl = 'data:application/pdf;base64,JVBERi0='
    return scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      click(role('button', { name: 'Choose resume' })),
      Command.resolveAll(
        [SelectResume, CompletedSelectResume({ file: resume })],
        [ReadResumePreview, SucceededReadPreview({ dataUrl: previewDataUrl })],
      ),
      expect(role('img', { name: 'Resume preview' })).toExist(),
    )
  })

  it.effect('drop zone: dropFiles simulates a drag-and-drop', () => {
    const coverLetter = new File(['cover'], 'cover.txt', {
      type: 'text/plain',
    })
    const portfolio = new File(['<svg/>'], 'portfolio.svg', {
      type: 'image/svg+xml',
    })
    return scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
      dropFiles(label('attachments'), [coverLetter, portfolio]),
      expect(text('2 attachments selected')).toExist(),
    )
  })
})
