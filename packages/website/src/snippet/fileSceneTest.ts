import { Scene } from 'foldkit'
import { describe, test } from 'vitest'

describe('resume upload flow', () => {
  test('the form captures the selected resume', () => {
    const resume = new File(['%PDF-'], 'resume.pdf', {
      type: 'application/pdf',
    })

    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.changeFiles(Scene.label('resume'), [resume]),
      Scene.expect(Scene.testId('resume-summary')).toContainText('resume.pdf'),
    )
  })

  test('the drop zone accepts multiple attachments', () => {
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
      Scene.expect(Scene.testId('attachment-count')).toContainText('2'),
    )
  })
})
