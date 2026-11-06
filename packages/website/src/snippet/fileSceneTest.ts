import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, layer } from './block'

describe('resume upload flow', () => {
  const resume = new File(['%PDF-'], 'resume.pdf', {
    type: 'application/pdf',
  })

  it.effect('inline file input: changeFiles simulates selection', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.changeFiles(Scene.label('resume'), [resume]),
      Scene.expect(Scene.text('resume.pdf')).toExist(),
    ),
  )

  it.effect('button-triggered picker: resolve the SelectResume Command', () => {
    const previewDataUrl = 'data:application/pdf;base64,JVBERi0='
    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.click(Scene.role('button', { name: 'Choose resume' })),
      Scene.Command.resolveAll(
        [SelectResume, CompletedSelectResume({ file: resume })],
        [ReadResumePreview, SucceededReadPreview({ dataUrl: previewDataUrl })],
      ),
      Scene.expect(Scene.role('img', { name: 'Resume preview' })).toExist(),
    )
  })

  it.effect('drop zone: dropFiles simulates a drag-and-drop', () => {
    const coverLetter = new File(['cover'], 'cover.txt', {
      type: 'text/plain',
    })
    const portfolio = new File(['<svg/>'], 'portfolio.svg', {
      type: 'image/svg+xml',
    })
    return Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.given(initialModel),
      Scene.dropFiles(Scene.label('attachments'), [coverLetter, portfolio]),
      Scene.expect(Scene.text('2 attachments selected')).toExist(),
    )
  })
})
