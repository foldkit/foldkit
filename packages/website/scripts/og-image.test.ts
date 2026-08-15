import { Array, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { maybePostCover } from '../src/page/blog/frontmatter'
import { BlogPostRoute, HomeRoute } from '../src/route'
import { blogPosts } from './blogPosts'
import { injectMetaTags } from './og-image'

const resolveApiModuleName = (slug: string) => slug

const baseHtml = `<html><head>
    <title>Foldkit</title>
    <link rel="canonical" href="https://foldkit.dev" />
    <meta name="description" content="base" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="base" />
    <meta property="og:title" content="base" />
    <meta property="og:description" content="base" />
    <meta property="og:image" content="base" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="base" />
    <meta name="twitter:title" content="base" />
    <meta name="twitter:description" content="base" />
    <meta name="twitter:image" content="base" />
  </head><body></body></html>`

const coverPost = Option.getOrThrowWith(
  Array.findFirst(blogPosts, ({ frontmatter }) =>
    Option.isSome(maybePostCover(frontmatter)),
  ),
  () => new Error('No blog post declares a cover image.'),
)

const coverlessPost = Option.getOrThrowWith(
  Array.findFirst(blogPosts, ({ frontmatter }) =>
    Option.isNone(maybePostCover(frontmatter)),
  ),
  () => new Error('Every blog post declares a cover image.'),
)

describe('injectMetaTags', () => {
  describe('a blog post with a cover', () => {
    const route = BlogPostRoute({ postSlug: coverPost.slug })
    const urlPath = `/blog/${coverPost.slug}`
    const ogSlug = `blog-${coverPost.slug}`

    const html = injectMetaTags(baseHtml, route, urlPath, resolveApiModuleName)

    it('keeps the og image at the generated PNG path', () => {
      expect(html).toContain(
        `property="og:image" content="https://foldkit.dev/og/${ogSlug}.png"`,
      )
      expect(html).toContain(
        `name="twitter:image" content="https://foldkit.dev/og/${ogSlug}.png"`,
      )
    })

    it('keeps the standard card dimensions', () => {
      expect(html).toContain('property="og:image:width" content="1200"')
      expect(html).toContain('property="og:image:height" content="630"')
    })

    it('uses the cover alt text for og:image:alt', () => {
      const cover = Option.getOrThrow(maybePostCover(coverPost.frontmatter))
      expect(html).toContain(`property="og:image:alt" content="${cover.alt}"`)
    })

    it('marks the page an article with its publication date', () => {
      expect(html).toContain('property="og:type" content="article"')
      expect(html).toContain(
        `property="article:published_time" content="${coverPost.frontmatter.date}"`,
      )
    })

    it('injects BlogPosting structured data', () => {
      expect(html).toContain('"@type":"BlogPosting"')
      expect(html).toContain(
        `"headline":${JSON.stringify(coverPost.frontmatter.title)}`,
      )
      expect(html).toContain(`"datePublished":"${coverPost.frontmatter.date}"`)
    })
  })

  describe('a blog post without a cover', () => {
    const route = BlogPostRoute({ postSlug: coverlessPost.slug })
    const urlPath = `/blog/${coverlessPost.slug}`

    const html = injectMetaTags(baseHtml, route, urlPath, resolveApiModuleName)

    it('falls back to the full title for og:image:alt', () => {
      expect(html).toContain(
        `property="og:image:alt" content="${coverlessPost.frontmatter.title} - Foldkit | Effect-TS Frontend Framework"`,
      )
    })
  })

  describe('a route outside the blog', () => {
    const html = injectMetaTags(
      baseHtml,
      HomeRoute(),
      '/',
      resolveApiModuleName,
    )

    it('uses the full title for og:image:alt', () => {
      expect(html).toContain(
        'property="og:image:alt" content="Foldkit - TypeScript Frontend Framework Built on Effect-TS | Elm Architecture"',
      )
    })

    it('stays og:type website and keeps the homepage structured data', () => {
      expect(html).toContain('property="og:type" content="website"')
      expect(html).toContain('"@type":"SoftwareApplication"')
      expect(html).not.toContain('article:published_time')
    })
  })
})
