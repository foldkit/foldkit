import { FileSystem } from 'effect'
import {
  Array,
  Console,
  Effect,
  Match as M,
  Option,
  String as String_,
  pipe,
} from 'effect'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { type Browser } from 'playwright'
import satori, { type Font } from 'satori'

import { Resvg } from '@resvg/resvg-js'

import { type PostCover, maybePostCover } from '../src/page/blog/frontmatter'
import { BLOG_AUTHOR } from '../src/page/blog/meta'
import { type AppRoute } from '../src/route'
import {
  type BlogPostEntry,
  PUBLIC_DIR,
  blogPosts,
  maybeCoverMimeType,
} from './blogPosts'
import {
  type ApiModuleNameResolver,
  type PageMetadata,
  routeToMetadata,
} from './metadata'

// LOGO

const LOGO_SVG_PATH = resolve(import.meta.dirname, '../public/logo-dark.svg')

const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(readFileSync(LOGO_SVG_PATH, 'utf-8')).toString('base64')}`

// FONT

const INTER_REGULAR_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff'

const INTER_BOLD_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff'

const fetchFont = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(url).then(response => response.arrayBuffer()),
    catch: () => new Error(`Failed to fetch font: ${url}`),
  })

const loadFonts = Effect.gen(function* () {
  const [regular, bold] = yield* Effect.all([
    fetchFont(INTER_REGULAR_URL),
    fetchFont(INTER_BOLD_URL),
  ])

  const fonts: Array<Font> = [
    { name: 'Inter', data: regular, weight: 400 },
    { name: 'Inter', data: bold, weight: 700 },
  ]

  return fonts
})

// TEMPLATE

const OG_WIDTH = 1200
const OG_HEIGHT = 630

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

type SatoriNode = {
  type: string
  props: Record<string, unknown>
}

const el = (
  type: string,
  style: Record<string, unknown>,
  children?: string | SatoriNode | ReadonlyArray<string | SatoriNode>,
): SatoriNode => ({
  type,
  props: {
    style,
    ...(children !== undefined ? { children } : {}),
  },
})

const LOGO_HEIGHT = 44
const LOGO_WIDTH = Math.round((801 / 200) * LOGO_HEIGHT)

const logo = (): SatoriNode => ({
  type: 'img',
  props: {
    src: logoDataUri,
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
})

const ogTemplate = (metadata: PageMetadata): SatoriNode =>
  el(
    'div',
    {
      display: 'flex',
      width: `${OG_WIDTH}px`,
      height: `${OG_HEIGHT}px`,
      backgroundColor: '#09090b',
      color: 'white',
      fontFamily: 'Inter',
      alignItems: 'center',
      justifyContent: 'center',
    },
    [
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '1080px',
          height: '510px',
        },
        [
          logo(),

          el('div', { display: 'flex', flexDirection: 'column', gap: '20px' }, [
            el(
              'div',
              {
                fontSize: '56px',
                fontWeight: 700,
                lineHeight: '1.1',
                letterSpacing: '-0.025em',
              },
              escapeHtml(metadata.title),
            ),
            el(
              'div',
              {
                fontSize: '28px',
                fontWeight: 400,
                color: '#a1a1aa',
                lineHeight: '1.4',
              },
              escapeHtml(metadata.description),
            ),
          ]),

          el(
            'div',
            {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            },
            [
              el(
                'div',
                {
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#8a8a93',
                },
                'foldkit.dev',
              ),
              ...(metadata.section
                ? [
                    el(
                      'div',
                      {
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#a1a1aa',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      },
                      escapeHtml(metadata.section),
                    ),
                  ]
                : []),
            ],
          ),
        ],
      ),
    ],
  )

// SLUG

const urlPathToSlug = (urlPath: string): string => {
  if (urlPath === '/') {
    return 'home'
  }

  return urlPath.slice(1).replace(/\//g, '-')
}

// COVER IMAGES

const maybeRoutePostEntry = (route: AppRoute): Option.Option<BlogPostEntry> =>
  M.value(route).pipe(
    M.tag('BlogPost', ({ postSlug }) =>
      Array.findFirst(blogPosts, ({ slug }) => slug === postSlug),
    ),
    M.orElse(() => Option.none()),
  )

const maybeRouteCover = (route: AppRoute): Option.Option<PostCover> =>
  Option.flatMap(maybeRoutePostEntry(route), ({ frontmatter }) =>
    maybePostCover(frontmatter),
  )

const coverMimeType = (src: string): Effect.Effect<string, Error> =>
  Option.match(maybeCoverMimeType(src), {
    onNone: () =>
      Effect.fail(
        new Error(`Cover image ${src} has no recognized image extension.`),
      ),
    onSome: Effect.succeed,
  })

// NOTE: Chromium decodes the cover and re-encodes it as PNG because resvg
// cannot embed webp sources, and PNG is the one format every OG consumer
// renders. The cover is center-cropped onto the standard 1200x630 card so
// every platform shows the same crop instead of choosing its own. The
// string-form evaluate polyfills the `__name` helper tsx injects into
// compiled callbacks; see the note on PAGE_INIT_SCRIPT in prerender.ts.
const renderCoverOgImage = (browser: Browser, cover: PostCover) =>
  Effect.gen(function* () {
    const mimeType = yield* coverMimeType(cover.src)
    const fs = yield* FileSystem.FileSystem
    const coverBytes = yield* fs.readFile(join(PUBLIC_DIR, cover.src))
    const sourceUri = `data:${mimeType};base64,${Buffer.from(coverBytes).toString('base64')}`

    const pngBase64 = yield* Effect.acquireUseRelease(
      Effect.tryPromise(() => browser.newPage()),
      page =>
        Effect.gen(function* () {
          yield* Effect.tryPromise(() =>
            page.evaluate('window.__name = (target) => target'),
          )
          return yield* Effect.tryPromise(() =>
            page.evaluate(
              async ({ source, targetHeight, targetWidth }) => {
                const image = new Image()
                image.src = source
                await image.decode()
                if (image.naturalWidth === 0 || image.naturalHeight === 0) {
                  throw new Error(
                    'Cover image decoded with no intrinsic dimensions.',
                  )
                }
                const canvas = document.createElement('canvas')
                canvas.width = targetWidth
                canvas.height = targetHeight
                const context = canvas.getContext('2d')
                if (context === null) {
                  throw new Error('Canvas 2d context is unavailable.')
                }
                const scale = Math.max(
                  targetWidth / image.naturalWidth,
                  targetHeight / image.naturalHeight,
                )
                const drawWidth = image.naturalWidth * scale
                const drawHeight = image.naturalHeight * scale
                context.drawImage(
                  image,
                  (targetWidth - drawWidth) / 2,
                  (targetHeight - drawHeight) / 2,
                  drawWidth,
                  drawHeight,
                )
                const pngPrefix = 'data:image/png;base64,'
                return canvas.toDataURL('image/png').slice(pngPrefix.length)
              },
              {
                source: sourceUri,
                targetHeight: OG_HEIGHT,
                targetWidth: OG_WIDTH,
              },
            ),
          )
        }),
      page => Effect.promise(() => page.close()),
    )

    return Buffer.from(pngBase64, 'base64')
  })

// GENERATION

const renderSatoriOgImage = (fonts: Array<Font>, metadata: PageMetadata) =>
  Effect.gen(function* () {
    const template = ogTemplate(metadata)

    const svg = yield* Effect.tryPromise(() =>
      // @ts-expect-error satori expects ReactNode but accepts plain {type, props} objects at runtime
      satori(template, {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts,
      }),
    )

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: OG_WIDTH },
    })

    return resvg.render().asPng()
  })

// NOTE: a failed render fails the whole prerender on purpose. The page's meta
// tags point at this file unconditionally, so shipping without it would ship
// an og:image URL that 404s.
const renderOgImage =
  (
    fonts: Array<Font>,
    ogDir: string,
    routeToUrlPath: (route: AppRoute) => string,
    resolveApiModuleName: ApiModuleNameResolver,
    browser: Browser,
  ) =>
  (route: AppRoute) => {
    const slug = urlPathToSlug(routeToUrlPath(route))
    return pipe(
      Effect.gen(function* () {
        const png = yield* Option.match(maybeRouteCover(route), {
          onNone: () =>
            renderSatoriOgImage(
              fonts,
              routeToMetadata(route, resolveApiModuleName),
            ),
          onSome: cover => renderCoverOgImage(browser, cover),
        })

        const fs = yield* FileSystem.FileSystem
        yield* fs.writeFile(resolve(ogDir, `${slug}.png`), png)
        yield* Console.log(`  ✓ og/${slug}.png`)
      }),
      Effect.mapError(
        error => new Error(`og/${slug}.png failed to render: ${String(error)}`),
      ),
    )
  }

export const generateOgImages = (
  routes: ReadonlyArray<AppRoute>,
  routeToUrlPath: (route: AppRoute) => string,
  distDir: string,
  resolveApiModuleName: ApiModuleNameResolver,
  browser: Browser,
) =>
  Effect.gen(function* () {
    yield* Console.log('Generating OG images...')

    const fonts = yield* loadFonts
    const fs = yield* FileSystem.FileSystem
    const ogDir = resolve(distDir, 'og')
    yield* fs.makeDirectory(ogDir, { recursive: true })

    yield* Effect.forEach(
      routes,
      renderOgImage(
        fonts,
        ogDir,
        routeToUrlPath,
        resolveApiModuleName,
        browser,
      ),
      { concurrency: 8 },
    )

    yield* Console.log(`Generated ${Array.length(routes)} OG images.`)
  })

// STRUCTURED DATA

const SITE_URL = 'https://foldkit.dev'

const SOFTWARE_APPLICATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Foldkit',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  description:
    'A TypeScript frontend framework built on Effect-TS, using The Elm Architecture. Predictable state, explicit effects, type-safe routing.',
  url: SITE_URL,
  author: { '@type': 'Organization', name: 'Foldkit' },
  programmingLanguage: 'TypeScript',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/licenses/MIT',
}

const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Foldkit',
  url: SITE_URL,
  description:
    'A TypeScript frontend framework built on Effect-TS using The Elm Architecture',
}

const jsonLdTag = (schema: Record<string, unknown>): string =>
  `<script type="application/ld+json">${JSON.stringify(schema)}</script>`

const HOMEPAGE_JSON_LD = [
  jsonLdTag(SOFTWARE_APPLICATION_SCHEMA),
  jsonLdTag(WEBSITE_SCHEMA),
].join('\n    ')

const blogPostingJsonLd = (
  entry: BlogPostEntry,
  pageUrl: string,
  ogImageUrl: string,
): string =>
  jsonLdTag({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: entry.frontmatter.title,
    description: entry.frontmatter.description,
    datePublished: entry.frontmatter.date,
    author: { '@type': 'Person', name: BLOG_AUTHOR },
    image: ogImageUrl,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
  })

// META TAG INJECTION

const replaceOrThrow = (
  html: string,
  pattern: RegExp,
  replacement: string,
  urlPath: string,
): string => {
  if (!pattern.test(html)) {
    throw new Error(
      `Head rewrite for ${urlPath} matched nothing with ${pattern}. The markup in index.html no longer has the shape this pattern expects.`,
    )
  }

  return html.replace(pattern, () => replacement)
}

export const injectMetaTags = (
  html: string,
  route: AppRoute,
  urlPath: string,
  resolveApiModuleName: ApiModuleNameResolver,
): string => {
  const metadata = routeToMetadata(route, resolveApiModuleName)
  const slug = urlPathToSlug(urlPath)
  const ogImageUrl = `${SITE_URL}/og/${slug}.png`
  const pageUrl = `${SITE_URL}${urlPath}`
  const fullTitle =
    metadata.title === 'Foldkit'
      ? 'Foldkit - TypeScript Frontend Framework Built on Effect-TS | Elm Architecture'
      : `${metadata.title} - Foldkit | Effect-TS Frontend Framework`

  const ogImageAlt = pipe(
    maybeRouteCover(route),
    Option.map(cover => cover.alt),
    Option.filter(String_.isNonEmpty),
    Option.getOrElse(() => fullTitle),
  )

  const escapedTitle = escapeHtml(fullTitle)
  const escapedDescription = escapeHtml(metadata.description)
  const escapedOgImageAlt = escapeHtml(ogImageAlt)

  const maybePostEntry = maybeRoutePostEntry(route)

  const ogType = Option.match(maybePostEntry, {
    onNone: () => 'website',
    onSome: () => 'article',
  })

  const headAppends = [
    ...(metadata.title === 'Foldkit' ? [HOMEPAGE_JSON_LD] : []),
    ...Option.match(maybePostEntry, {
      onNone: () => [],
      onSome: entry => [
        `<meta property="article:published_time" content="${entry.frontmatter.date}" />`,
        blogPostingJsonLd(entry, pageUrl, ogImageUrl),
      ],
    }),
  ]

  const metaTagReplacements: ReadonlyArray<readonly [RegExp, string]> = [
    [/<title>[^<]*<\/title>/, `<title>${escapedTitle}</title>`],
    [/rel="canonical"\s+href="[^"]*"/, `rel="canonical" href="${pageUrl}"`],
    [
      /property="og:type"\s+content="[^"]*"/,
      `property="og:type" content="${ogType}"`,
    ],
    [
      /name="description"\s+content="[^"]*"/,
      `name="description" content="${escapedDescription}"`,
    ],
    [
      /property="og:url"\s+content="[^"]*"/,
      `property="og:url" content="${pageUrl}"`,
    ],
    [
      /property="og:title"\s+content="[^"]*"/,
      `property="og:title" content="${escapedTitle}"`,
    ],
    [
      /property="og:description"\s+content="[^"]*"/,
      `property="og:description" content="${escapedDescription}"`,
    ],
    [
      /property="og:image"\s+content="[^"]*"/,
      `property="og:image" content="${ogImageUrl}"`,
    ],
    [
      /property="og:image:alt"\s+content="[^"]*"/,
      `property="og:image:alt" content="${escapedOgImageAlt}"`,
    ],
    [
      /name="twitter:title"\s+content="[^"]*"/,
      `name="twitter:title" content="${escapedTitle}"`,
    ],
    [
      /name="twitter:description"\s+content="[^"]*"/,
      `name="twitter:description" content="${escapedDescription}"`,
    ],
    [
      /name="twitter:image"\s+content="[^"]*"/,
      `name="twitter:image" content="${ogImageUrl}"`,
    ],
  ]

  const withMetaTags = Array.reduce(
    metaTagReplacements,
    html,
    (currentHtml, [pattern, replacement]) =>
      replaceOrThrow(currentHtml, pattern, replacement, urlPath),
  )

  return replaceOrThrow(
    withMetaTags,
    /<\/head>/,
    Array.isArrayNonEmpty(headAppends)
      ? `${Array.join(headAppends, '\n    ')}\n  </head>`
      : '</head>',
    urlPath,
  )
}
