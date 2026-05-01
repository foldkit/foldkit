import { FileSystem } from 'effect/unstable/http'
import { Resvg } from '@resvg/resvg-js'
import { Array, Console, Effect, pipe } from 'effect'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import satori, { type Font } from 'satori'

import { type AppRoute } from '../src/route'
import { type PageMetadata, routeToMetadata } from './metadata'

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

// GENERATION

const renderOgImage =
  (
    fonts: Array<Font>,
    ogDir: string,
    routeToUrlPath: (route: AppRoute) => string,
  ) =>
  (route: AppRoute) =>
    pipe(
      Effect.gen(function* () {
        const metadata = routeToMetadata(route)
        const template = ogTemplate(metadata)
        const slug = urlPathToSlug(routeToUrlPath(route))

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
        const png = resvg.render().asPng()

        const fs = yield* FileSystem.FileSystem
        yield* fs.writeFile(resolve(ogDir, `${slug}.png`), png)
        yield* Console.log(`  ✓ og/${slug}.png`)
      }),
      Effect.catch(error =>
        Console.warn(
          `  ✗ og/${urlPathToSlug(routeToUrlPath(route))}.png: ${String(error)}`,
        ),
      ),
    )

export const generateOgImages = (
  routes: ReadonlyArray<AppRoute>,
  routeToUrlPath: (route: AppRoute) => string,
  distDir: string,
) =>
  Effect.gen(function* () {
    yield* Console.log('Generating OG images...')

    const fonts = yield* loadFonts
    const fs = yield* FileSystem.FileSystem
    const ogDir = resolve(distDir, 'og')
    yield* fs.makeDirectory(ogDir, { recursive: true })

    yield* Effect.forEach(routes, renderOgImage(fonts, ogDir, routeToUrlPath), {
      concurrency: 8,
    })

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

// META TAG INJECTION

export const injectMetaTags = (
  html: string,
  route: AppRoute,
  urlPath: string,
): string => {
  const metadata = routeToMetadata(route)
  const slug = urlPathToSlug(urlPath)
  const ogImageUrl = `${SITE_URL}/og/${slug}.png`
  const pageUrl = `${SITE_URL}${urlPath}`
  const fullTitle =
    metadata.title === 'Foldkit'
      ? 'Foldkit - TypeScript Frontend Framework Built on Effect-TS | Elm Architecture'
      : `${metadata.title} - Foldkit | Effect-TS Frontend Framework`

  const jsonLd = metadata.title === 'Foldkit' ? HOMEPAGE_JSON_LD : ''

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`)
    .replace(
      /rel="canonical" href="[^"]*"/,
      `rel="canonical" href="${pageUrl}"`,
    )
    .replace(
      /name="description" content="[^"]*"/,
      `name="description" content="${metadata.description}"`,
    )
    .replace(
      /property="og:url" content="[^"]*"/,
      `property="og:url" content="${pageUrl}"`,
    )
    .replace(
      /property="og:title" content="[^"]*"/,
      `property="og:title" content="${fullTitle}"`,
    )
    .replace(
      /property="og:description" content="[^"]*"/,
      `property="og:description" content="${metadata.description}"`,
    )
    .replace(
      /property="og:image" content="[^"]*"/,
      `property="og:image" content="${ogImageUrl}"`,
    )
    .replace(
      /property="og:image:alt" content="[^"]*"/,
      `property="og:image:alt" content="${fullTitle}"`,
    )
    .replace(
      /name="twitter:title" content="[^"]*"/,
      `name="twitter:title" content="${fullTitle}"`,
    )
    .replace(
      /name="twitter:description" content="[^"]*"/,
      `name="twitter:description" content="${metadata.description}"`,
    )
    .replace(
      /name="twitter:image" content="[^"]*"/,
      `name="twitter:image" content="${ogImageUrl}"`,
    )
    .replace('</head>', jsonLd ? `${jsonLd}\n  </head>` : '</head>')
}
