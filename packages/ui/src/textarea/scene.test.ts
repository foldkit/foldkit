import { html } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

type Model = Readonly<{ hasDescription: boolean }>
type Message = never

const update = (model: Model): readonly [Model, ReadonlyArray<never>] => [
  model,
  [],
]

const sceneView = (model: Model) => {
  const h = html<Message>()

  return view<Message>({
    id: 'test',
    hasDescription: model.hasDescription,
    toView: attributes =>
      h.div(
        [],
        [
          h.label([...attributes.label], ['Bio']),
          h.textarea([...attributes.textarea], []),
          h.span([...attributes.description], ['A brief introduction.']),
        ],
      ),
  })
}

const textarea = Scene.selector('#test')

describe('Textarea', () => {
  describe('view', () => {
    it('omits aria-describedby when no description is wired', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with({ hasDescription: false }),
        Scene.expect(textarea).not.toHaveAttr('aria-describedby'),
      )
    })

    it('sets aria-describedby when a description is wired', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.with({ hasDescription: true }),
        Scene.expect(textarea).toHaveAttr(
          'aria-describedby',
          'test-description',
        ),
      )
    })
  })
})
