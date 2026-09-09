import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'

import * as Animation from './animation/index.js'

describe('view identity branding', () => {
  it('stamps a rendered vnode with the owning ui module identity', () => {
    const model = Animation.init({ id: 'sanity', isShowing: true })

    let renderedVNode!: Html
    Scene.scene(
      {
        update: Animation.update,
        view: (
          currentModel: Animation.Model,
          h: HtmlBuilder<Animation.Message>,
        ) => {
          renderedVNode = Animation.view(
            currentModel,
            { content: h.div([]) },
            h,
          )
          return renderedVNode
        },
      },
      Scene.given(model),
    )

    expect(renderedVNode?.identity).toMatch(/^src\/animation\/index\.ts#/)
  })
})
