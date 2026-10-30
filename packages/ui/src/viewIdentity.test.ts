import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Animation, AnimationLive } from './animation/block.js'

type IdentityProbeArgs = Readonly<{ onRender: (vnode: Html) => void }>

class IdentityProbe extends Block<IdentityProbe, IdentityProbeArgs>()(
  'IdentityProbe',
  { Model: Schema.Struct({ animation: Animation }) },
) {}

const IdentityProbeLive = IdentityProbe.make(
  Effect.fn(function* (_id, { onRender }) {
    const animation = yield* new Animation('animation', {
      id: 'sanity',
      isShowing: true,
    })

    return {
      model: { animation },
      view: (model, h) => {
        const vnode = model.animation.view({ toView: () => h.div([]) })
        onRender(vnode)
        return vnode
      },
    }
  }),
).pipe(Layer.provide(AnimationLive))

describe('view identity branding', () => {
  it.effect('stamps a rendered vnode with the owning ui module identity', () =>
    Effect.gen(function* () {
      let renderedVNode: Html | undefined

      yield* Scene.scene(IdentityProbeLive, {
        onRender: vnode => {
          renderedVNode = vnode
        },
      })

      expect(renderedVNode?.identity).toMatch(/^src\/animation\/block\.ts#/)
    }),
  )
})
