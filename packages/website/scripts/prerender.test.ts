import { Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { SECTION_ORDER } from './markdown'
import { routeToMetadata } from './metadata'
import {
  STATIC_ROUTES,
  buildBlogRssFeed,
  buildPlaygroundShellHtml,
  enumerateRoutes,
  extractPostArticleHtml,
  injectHtml,
  toFeedArticleHtml,
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
    maybeCoverAsset: Option.none(),
  })

  const NO_ARTICLES: ReadonlyMap<string, string> = new Map()

  it('declares itself with an atom self link and the newest post as last build date', () => {
    const feed = buildBlogRssFeed(
      [
        entry('newer', 'Newer', '2026-08-01'),
        entry('older', 'Older', '2026-07-01'),
      ],
      NO_ARTICLES,
    )

    expect(feed).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
    expect(feed).toContain(
      '<atom:link href="https://foldkit.dev/blog/rss.xml" rel="self" type="application/rss+xml" />',
    )
    expect(feed).toContain(
      '<lastBuildDate>Sat, 01 Aug 2026 00:00:00 GMT</lastBuildDate>',
    )
  })

  it('emits one item per post, newest first, with an absolute guid', () => {
    const feed = buildBlogRssFeed(
      [
        entry('newer', 'Newer', '2026-08-01'),
        entry('older', 'Older', '2026-07-01'),
      ],
      NO_ARTICLES,
    )

    expect(feed).toContain('<guid>https://foldkit.dev/blog/newer</guid>')
    expect(feed.indexOf('<title>Newer</title>')).toBeLessThan(
      feed.indexOf('<title>Older</title>'),
    )
  })

  it('attaches the cover as an enclosure when a post declares one', () => {
    const feed = buildBlogRssFeed(
      [
        {
          ...entry('covered', 'Covered', '2026-08-01'),
          maybeCoverAsset: Option.some({
            src: '/blog/covered/cover.webp',
            mimeType: 'image/webp',
            byteLength: 23072,
          }),
        },
      ],
      NO_ARTICLES,
    )

    expect(feed).toContain(
      '<enclosure url="https://foldkit.dev/blog/covered/cover.webp" length="23072" type="image/webp" />',
    )
  })

  it('omits the enclosure when a post has no cover', () => {
    const feed = buildBlogRssFeed(
      [entry('plain', 'Plain', '2026-08-01')],
      NO_ARTICLES,
    )

    expect(feed).not.toContain('<enclosure')
  })

  it('embeds a post article as CDATA content when one is provided', () => {
    const feed = buildBlogRssFeed(
      [entry('full', 'Full', '2026-08-01')],
      new Map([['full', '<article><p>Hello.</p></article>']]),
    )

    expect(feed).toContain(
      'xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    )
    expect(feed).toContain(
      '<content:encoded><![CDATA[<article><p>Hello.</p></article>]]></content:encoded>',
    )
  })

  it('splits CDATA-terminating sequences inside article content', () => {
    const feed = buildBlogRssFeed(
      [entry('tricky', 'Tricky', '2026-08-01')],
      new Map([['tricky', '<article><p>a ]]> b</p></article>']]),
    )

    expect(feed).toContain('a ]]]]><![CDATA[> b')
  })

  it('omits content:encoded when no article is provided', () => {
    const feed = buildBlogRssFeed(
      [entry('plain', 'Plain', '2026-08-01')],
      NO_ARTICLES,
    )

    expect(feed).not.toContain('<content:encoded>')
  })

  it('escapes markup characters in post fields', () => {
    const feed = buildBlogRssFeed(
      [entry('escaping', 'Types & <script>', '2026-08-01')],
      NO_ARTICLES,
    )

    expect(feed).toContain('<title>Types &amp; &lt;script&gt;</title>')
    expect(feed).not.toContain('<script>')
  })

  it('omits the last build date when there are no posts', () => {
    const feed = buildBlogRssFeed([], NO_ARTICLES)

    expect(feed).not.toContain('<lastBuildDate>')
    expect(feed).not.toContain('<item>')
  })
})

describe('extractPostArticleHtml', () => {
  it('extracts the article element from a page', () => {
    const page =
      '<div><header>chrome</header><article class="post"><p>Body.</p></article><footer>chrome</footer></div>'

    expect(Option.getOrThrow(extractPostArticleHtml(page))).toBe(
      '<article class="post"><p>Body.</p></article>',
    )
  })

  it('returns none for a page without an article', () => {
    expect(Option.isNone(extractPostArticleHtml('<div>no article</div>'))).toBe(
      true,
    )
  })
})

describe('toFeedArticleHtml', () => {
  it('absolutizes root-relative links and image sources', () => {
    const article =
      '<article><img src="/blog/post/cover.webp" /><a href="/core/model">Model</a></article>'

    expect(toFeedArticleHtml(article)).toBe(
      '<article><img src="https://foldkit.dev/blog/post/cover.webp" /><a href="https://foldkit.dev/core/model">Model</a></article>',
    )
  })

  it('drops the back-to-blog link and keeps other anchors', () => {
    const article =
      '<article><a class="back" href="/blog">← Blog</a><p>Body with <a href="https://example.com">a link</a>.</p></article>'

    expect(toFeedArticleHtml(article)).toBe(
      '<article><p>Body with <a href="https://example.com">a link</a>.</p></article>',
    )
  })
})
