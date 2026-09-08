import { Array, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { maybePostCover } from '../src/page/blog/frontmatter'
import { AppRoute } from '../src/route'
import { blogPosts } from './blogPosts'
import { ORGANIZATION_SCHEMA, injectMetaTags } from './og-image'

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
    <meta name="twitter:image:alt" content="base" />
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
    const route = AppRoute.BlogPost({ postSlug: coverPost.slug })
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
      expect(html).toContain(`name="twitter:image:alt" content="${cover.alt}"`)
    })

    it('marks the page an article with its publication date', () => {
      expect(html).toContain('property="og:type" content="article"')
      expect(html).toContain(
        `property="article:published_time" content="${coverPost.frontmatter.date}"`,
      )
      expect(html).toContain('property="article:section" content="Blog"')
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
    const route = AppRoute.BlogPost({ postSlug: coverlessPost.slug })
    const urlPath = `/blog/${coverlessPost.slug}`

    const html = injectMetaTags(baseHtml, route, urlPath, resolveApiModuleName)

    it('describes the generated social card', () => {
      expect(html).toContain(
        `property="og:image:alt" content="Foldkit social card for ${coverlessPost.frontmatter.title} in Blog."`,
      )
      expect(html).toContain(
        `name="twitter:image:alt" content="Foldkit social card for ${coverlessPost.frontmatter.title} in Blog."`,
      )
    })
  })

  describe('a documentation route', () => {
    const html = injectMetaTags(
      baseHtml,
      AppRoute.Examples(),
      '/example-apps',
      resolveApiModuleName,
    )

    it('uses the page title followed by the site name', () => {
      expect(html).toContain('<title>Examples | Foldkit</title>')
      expect(html).toContain('property="og:title" content="Examples | Foldkit"')
      expect(html).toContain(
        'name="twitter:title" content="Examples | Foldkit"',
      )
    })

    it('describes the generated social card', () => {
      expect(html).toContain(
        'property="og:image:alt" content="Foldkit social card for Examples."',
      )
      expect(html).toContain(
        'name="twitter:image:alt" content="Foldkit social card for Examples."',
      )
    })
  })

  describe('a Playground route', () => {
    const html = injectMetaTags(
      baseHtml,
      AppRoute.Playground({ exampleSlug: 'counter' }),
      '/playground/counter',
      resolveApiModuleName,
    )

    it('uses Playground-specific titles, copy, and image text', () => {
      expect(html).toContain('<title>Counter Playground | Foldkit</title>')
      expect(html).toContain(
        'name="description" content="Edit and run the Counter example live in your browser."',
      )
      expect(html).toContain(
        'property="og:image:alt" content="Foldkit social card for Counter Playground in Playground."',
      )
      expect(html).toContain(
        'name="twitter:image:alt" content="Foldkit social card for Counter Playground in Playground."',
      )
    })
  })

  describe('a route outside the blog', () => {
    const html = injectMetaTags(
      baseHtml,
      AppRoute.Home(),
      '/',
      resolveApiModuleName,
    )

    it('uses the landing title and description throughout the head', () => {
      expect(html).toContain(
        '<title>Foldkit | TypeScript Frontend Framework Built on Effect</title>',
      )
      expect(html).toContain(
        'name="description" content="Foldkit is a TypeScript frontend framework built on Effect. One Schema-defined Model, explicit effects, typed routing, server rendering, and accessible UI components."',
      )
      expect(html).toContain(
        'property="og:title" content="Foldkit | TypeScript Frontend Framework Built on Effect"',
      )
      expect(html).toContain(
        'name="twitter:title" content="Foldkit | TypeScript Frontend Framework Built on Effect"',
      )
      expect(html).toContain(
        'property="og:image:alt" content="Foldkit | TypeScript Frontend Framework Built on Effect"',
      )
      expect(html).toContain(
        'name="twitter:image:alt" content="Foldkit | TypeScript Frontend Framework Built on Effect"',
      )
      expect(html).toContain(
        '"description":"Foldkit is a TypeScript frontend framework built on Effect. One Schema-defined Model, explicit effects, typed routing, server rendering, and accessible UI components."',
      )
    })

    it('stays og:type website and keeps the homepage structured data', () => {
      expect(html).toContain('property="og:type" content="website"')
      expect(html).toContain('"@type":"SoftwareApplication"')
      expect(html).not.toContain('article:published_time')
    })

    it('describes the Foldkit Organization with contact points', () => {
      expect(ORGANIZATION_SCHEMA['@type']).toBe('Organization')
      expect(ORGANIZATION_SCHEMA.url).toBe('https://foldkit.dev')
      expect(ORGANIZATION_SCHEMA.logo).toBe('https://foldkit.dev/logo.svg')
      expect(ORGANIZATION_SCHEMA.sameAs).toContain(
        'https://github.com/foldkit/foldkit',
      )
      expect(
        Array.map(
          ORGANIZATION_SCHEMA.contactPoint,
          contactPoint => contactPoint.url,
        ),
      ).toEqual([
        'https://github.com/foldkit/foldkit/issues',
        'https://foldkit.dev/contact',
      ])
      expect(
        Array.map(
          ORGANIZATION_SCHEMA.contactPoint,
          contactPoint => contactPoint.contactType,
        ),
      ).toContain('technical support')
      expect(html).toContain('"@type":"Organization"')
      expect(html).toContain('"contactPoint"')
    })
  })

  describe('the trust anchor pages', () => {
    it('marks up About, Contact, and Privacy as their schema.org page types', () => {
      const aboutHtml = injectMetaTags(
        baseHtml,
        AppRoute.About(),
        '/about',
        resolveApiModuleName,
      )
      expect(aboutHtml).toContain('"@type":"AboutPage"')
      expect(aboutHtml).toContain('"url":"https://foldkit.dev/about"')
      expect(aboutHtml).toContain('"@id":"https://foldkit.dev/#organization"')

      const contactHtml = injectMetaTags(
        baseHtml,
        AppRoute.Contact(),
        '/contact',
        resolveApiModuleName,
      )
      expect(contactHtml).toContain('"@type":"ContactPage"')

      const privacyHtml = injectMetaTags(
        baseHtml,
        AppRoute.Privacy(),
        '/privacy',
        resolveApiModuleName,
      )
      expect(privacyHtml).toContain('"@type":"WebPage"')
      expect(privacyHtml).toContain('"name":"Foldkit Privacy Policy"')
    })

    it('leaves ordinary documentation pages without a page-level schema', () => {
      const docsHtml = injectMetaTags(
        baseHtml,
        AppRoute.CoreModel(),
        '/core/model',
        resolveApiModuleName,
      )

      expect(docsHtml).not.toContain('"@type":"AboutPage"')
      expect(docsHtml).not.toContain('"@type":"WebPage"')
    })
  })

  describe('the prerendered 404 page', () => {
    const html = injectMetaTags(
      baseHtml,
      AppRoute.NotFound({ path: '/404' }),
      '/404',
      resolveApiModuleName,
    )

    it('titles the page and points its social card at the 404 slug', () => {
      expect(html).toContain('<title>Page Not Found | Foldkit</title>')
      expect(html).toContain(
        'property="og:image" content="https://foldkit.dev/og/404.png"',
      )
      expect(html).toContain('rel="canonical" href="https://foldkit.dev/404"')
    })
  })
})
