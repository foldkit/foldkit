import { inertHtml as ih } from 'foldkit/html'
import { describe, expect, it } from 'vitest'

describe('view identity branding', () => {
  it('stamps vnodes returned from devtools source modules', () => {
    const panelView = () => ih.div([])

    const vnode = panelView()

    // The identity names the source position and nothing else. It ships in the
    // client bundle, so anything derived from the module's contents would be a
    // published check against those contents.
    expect(vnode?.identity).toBe('src/viewIdentity.test.ts#panelView')
  })
})
