import { Effect, Option } from 'effect'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { NodeServices } from '@effect/platform-node'

import { SECTION_ORDER, shouldExportMarkdown } from './markdown'
import { routeToMetadata } from './metadata'
import {
  NOT_FOUND_OUTPUT_PATH,
  NOT_FOUND_ROUTE,
  STATIC_ROUTES,
  buildBlogRssFeed,
  enumerateRoutes,
  extractPostArticleHtml,
  readTemplateFrom,
  routeToUrlPath,
  toFeedArticleHtml,
} from './prerender'

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

describe('the 404 page', () => {
  it('prerenders at /404 into a root-level 404.html', () => {
    expect(NOT_FOUND_ROUTE._tag).toBe('NotFound')
    expect(routeToUrlPath(NOT_FOUND_ROUTE)).toBe('/404')
    expect(NOT_FOUND_OUTPUT_PATH).toBe('404.html')
  })

  it('stays out of the sitemap routes and the markdown exports', () => {
    const routes = enumerateRoutes(['html'])
    expect(routes.filter(route => route._tag === 'NotFound')).toEqual([])
    expect(shouldExportMarkdown(NOT_FOUND_ROUTE)).toBe(false)
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

describe('readTemplateFrom', () => {
  const directories: Array<string> = []

  const workspace = async (): Promise<string> => {
    const directory = await mkdtemp(join(tmpdir(), 'foldkit-prerender-'))
    directories.push(directory)
    return directory
  }

  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map(directory => rm(directory, { recursive: true, force: true })),
    )
  })

  const TEMPLATE =
    '<!doctype html><html><head><title>Template</title></head><body><div id="root"></div></body></html>'
  const GENERATED =
    '<!doctype html><html><head><title>Home</title></head><body><main data-foldkit-app="app">home</main></body></html>'

  const read = (indexPath: string, copyPath: string): Promise<string> =>
    Effect.runPromise(
      readTemplateFrom(indexPath, copyPath).pipe(
        Effect.provide(NodeServices.layer),
      ),
    )

  it('takes the built index as the template and keeps a copy of it', async () => {
    const directory = await workspace()
    const indexPath = join(directory, 'index.html')
    const copyPath = join(directory, 'cache/template.html')
    await writeFile(indexPath, TEMPLATE)

    expect(await read(indexPath, copyPath)).toBe(TEMPLATE)
    expect(await readFile(copyPath, 'utf8')).toBe(TEMPLATE)
  })

  // The generated `/` replaces the index the template came from, so a second
  // run over one client build reads a page this script wrote. Reading the copy
  // instead is what makes the run repeatable rather than a failure that names
  // the application's own index.
  it('returns the template again once the index holds a generated page', async () => {
    const directory = await workspace()
    const indexPath = join(directory, 'index.html')
    const copyPath = join(directory, 'cache/template.html')
    await writeFile(indexPath, TEMPLATE)

    await read(indexPath, copyPath)
    await writeFile(indexPath, GENERATED)

    expect(await read(indexPath, copyPath)).toBe(TEMPLATE)
  })

  it('refuses a generated index when no copy of the template remains', async () => {
    const directory = await workspace()
    const indexPath = join(directory, 'index.html')
    await writeFile(indexPath, GENERATED)

    await expect(
      read(indexPath, join(directory, 'cache/template.html')),
    ).rejects.toThrow(/no copy of the template remains/)
  })

  it('refuses to run without a client build', async () => {
    const directory = await workspace()

    await expect(
      read(join(directory, 'index.html'), join(directory, 'cache/t.html')),
    ).rejects.toThrow(/without a client build/)
  })
})
