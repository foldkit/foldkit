import { describe, expect, it } from 'vitest'

import {
  STATIC_ROUTES,
  buildPlaygroundShellHtml,
  enumerateRoutes,
  injectHtml,
} from './prerender'

describe('injectHtml', () => {
  it('wraps rendered html in the root div', () => {
    const base = '<body><div id="root"></div></body>'
    const rendered = '<div class="app"><p>hello</p></div>'
    expect(injectHtml(base, rendered)).toBe(
      '<body><div id="root"><div class="app"><p>hello</p></div></div></body>',
    )
  })

  it('is a no-op when the placeholder is not present', () => {
    const base = '<body><div id="other"></div></body>'
    const rendered = '<div class="app"><p>hello</p></div>'
    expect(injectHtml(base, rendered)).toBe(base)
  })
})

describe('buildPlaygroundShellHtml', () => {
  it('injects the neutral spinner shell into the root div', () => {
    const base = '<body><div id="root"></div></body>'
    const result = buildPlaygroundShellHtml(base)
    expect(result.startsWith('<body><div id="root">')).toBe(true)
    expect(result).toContain('Starting playground')
    expect(result).toContain('animate-spin')
    expect(result).not.toContain('<div id="root"></div>')
  })
})

describe('enumerateRoutes', () => {
  it('includes all static routes', () => {
    const routes = enumerateRoutes([])
    expect(routes.length).toBe(STATIC_ROUTES.length)
  })

  it('appends an ApiModule route for each module slug', () => {
    const routes = enumerateRoutes(['html', 'runtime'])
    expect(routes.length).toBe(STATIC_ROUTES.length + 2)
    expect(routes.at(-2)).toEqual({
      _tag: 'ApiModule',
      moduleSlug: 'html',
    })
    expect(routes.at(-1)).toEqual({
      _tag: 'ApiModule',
      moduleSlug: 'runtime',
    })
  })
})
