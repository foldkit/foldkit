import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

describe('resume upload flow', () => {
  const resume = new File(['%PDF-'], 'resume.pdf', {
    type: 'application/pdf',
  })

  test('inline file input: changeFiles simulates selection', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.changeFiles(Scene.label('resume'), [resume]),
      Scene.expect(Scene.text('resume.pdf')).toExist(),
    )
  })

  test('button-triggered picker: resolve the SelectResume Command', () => {
    const previewDataUrl = 'data:application/pdf;base64,JVBERi0='

    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Choose resume' })),
      Scene.resolveAll(
        [SelectResume, SelectedResume({ files: [resume] })],
        [ReadResumePreview, SucceededReadPreview({ dataUrl: previewDataUrl })],
      ),
      Scene.expect(Scene.role('img', { name: 'Resume preview' })).toExist(),
    )
  })

  test('drop zone: dropFiles simulates a drag-and-drop', () => {
    const coverLetter = new File(['cover'], 'cover.txt', {
      type: 'text/plain',
    })
    const portfolio = new File(['<svg/>'], 'portfolio.svg', {
      type: 'image/svg+xml',
    })

    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.dropFiles(Scene.label('attachments'), [coverLetter, portfolio]),
      Scene.expect(Scene.text('2 attachments selected')).toExist(),
    )
  })
})
