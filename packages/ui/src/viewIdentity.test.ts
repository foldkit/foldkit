import { html } from 'foldkit/html'
import { describe, expect, it } from 'vitest'

import * as Animation from './animation/index.js'

describe('view identity branding', () => {
  it('stamps a rendered vnode with the owning ui module identity', () => {
    const h = html()
    const model = Animation.init({ id: 'sanity', isShowing: true })

    const vnode = Animation.view(model, { content: h.div([], []) })

    expect(vnode?.identity).toMatch(/^src\/animation\/index\.ts#/)
  })
})
