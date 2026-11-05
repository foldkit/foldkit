import { Effect } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from './animation/public.js'

describe('view identity branding', () => {
  it.effect('stamps a rendered vnode with the owning ui module identity', () =>
    Story.withBlock(Animation.AnimationBlock, animation => {
      const model = animation.init({ id: 'sanity', isShowing: true }).model

      Scene.scene(
        {
          update: animation.update,
          view: (currentModel, h) =>
            animation.view(currentModel, { toView: () => h.div([]) }, h),
        },
        Scene.given(model),
        Scene.tap(({ html }) =>
          expect(html.identity).toMatch(/^src\/animation\/view\.ts#/),
        ),
      )
    }).pipe(Effect.provide(Animation.layer)),
  )
})
