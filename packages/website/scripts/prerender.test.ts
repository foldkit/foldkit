import { describe, expect, it } from 'vitest'

import { SECTION_ORDER } from './markdown'
import { routeToMetadata } from './metadata'
import {
  STATIC_ROUTES,
  buildBlogRssFeed,
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

describe('page metadata sections', () => {
  it('ranks every section a static route reports', () => {
    const unranked = STATIC_ROUTES.map(
      route => routeToMetadata(route, slug => slug).section,
    ).filter(section => section.length > 0 && !SECTION_ORDER.includes(section))

    expect(unranked).toEqual([])
  })
})

describe('buildBlogRssFeed', () => {
  const entry = (slug: string, title: string, date: string) => ({
    slug,
    frontmatter: { title, description: `About ${title}.`, date },
  })

  it('declares itself with an atom self link and the newest post as last build date', () => {
    const feed = buildBlogRssFeed([
      entry('newer', 'Newer', '2026-08-01'),
      entry('older', 'Older', '2026-07-01'),
    ])

    expect(feed).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
    expect(feed).toContain(
      '<atom:link href="https://foldkit.dev/blog/rss.xml" rel="self" type="application/rss+xml" />',
    )
    expect(feed).toContain(
      '<lastBuildDate>Sat, 01 Aug 2026 00:00:00 GMT</lastBuildDate>',
    )
  })

  it('emits one item per post, newest first, with an absolute guid', () => {
    const feed = buildBlogRssFeed([
      entry('newer', 'Newer', '2026-08-01'),
      entry('older', 'Older', '2026-07-01'),
    ])

    expect(feed).toContain('<guid>https://foldkit.dev/blog/newer</guid>')
    expect(feed.indexOf('<title>Newer</title>')).toBeLessThan(
      feed.indexOf('<title>Older</title>'),
    )
  })

  it('escapes markup characters in post fields', () => {
    const feed = buildBlogRssFeed([
      entry('escaping', 'Types & <script>', '2026-08-01'),
    ])

    expect(feed).toContain('<title>Types &amp; &lt;script&gt;</title>')
    expect(feed).not.toContain('<script>')
  })

  it('omits the last build date when there are no posts', () => {
    const feed = buildBlogRssFeed([])

    expect(feed).not.toContain('<lastBuildDate>')
    expect(feed).not.toContain('<item>')
  })
})
