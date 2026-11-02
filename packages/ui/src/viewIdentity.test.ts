import { Effect } from 'effect'
import type { Html } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import * as Animation from './animation/public.js'

describe('view identity branding', () => {
  it('stamps a rendered vnode with the owning ui module identity', () =>
    Effect.runPromise(
      Story.withBlock(Animation.AnimationBlock, animation => {
        const model = animation.init({ id: 'sanity', isShowing: true }).model

        let renderedVNode!: Html
        Scene.scene(
          {
            update: animation.update,
            view: (currentModel, h) => {
              renderedVNode = animation.view(
                currentModel,
                { toView: () => h.div([]) },
                h,
              )
              return renderedVNode
            },
          },
          Scene.given(model),
        )

        expect(renderedVNode?.identity).toMatch(/^src\/animation\/view\.ts#/)
      }).pipe(Effect.provide(Animation.layer)),
    ))
})
