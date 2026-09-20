import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// NOTE: The site keeps no per-client counter, so these values never change.
// They publish the advisory ceiling and its window, which is what lets an agent
// pace itself. `/api` documents that the remaining count always reports the
// full quota. Keep them in step with RATE_LIMIT_* in
// packages/website/scripts/contentApi.ts.
const RATE_LIMIT_QUOTA = 600

const RATE_LIMIT_WINDOW_SECONDS = 60

const rateLimitHeaders = {
  'RateLimit-Policy': `"default";q=${RATE_LIMIT_QUOTA};w=${RATE_LIMIT_WINDOW_SECONDS}`,
  RateLimit: `"default";r=${RATE_LIMIT_QUOTA};t=${RATE_LIMIT_WINDOW_SECONDS}`,
}

const sharedResponseHeaders = channel => {
  if (channel === 'production') {
    return {
      'Cross-Origin-Resource-Policy': 'same-origin',
      ...rateLimitHeaders,
    }
  } else {
    return {
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Robots-Tag': 'noindex, nofollow',
      ...rateLimitHeaders,
    }
  }
}

const API_VERSION = 'v1'

const API_BASE_PATH = `/api/${API_VERSION}`

const PROBLEM_CONTENT_TYPE = 'application/problem+json; charset=utf-8'

const NOT_FOUND_PROBLEM_PATH = `${API_BASE_PATH}/errors/not-found.json`

const METHOD_NOT_ALLOWED_PROBLEM_PATH = `${API_BASE_PATH}/errors/method-not-allowed.json`

const READ_METHODS = 'GET, HEAD, OPTIONS'

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

// NOTE: CORS exposes only the safelisted response headers to script. Every
// header the API tells an agent to read has to be named here, or a browser
// agent sees the body and none of the metadata.
const EXPOSED_HEADERS =
  'API-Version, RateLimit, RateLimit-Policy, Allow, Link, Deprecation, Sunset'

// NOTE: the content API is public and read-only, so it answers any origin. The
// site-wide `Cross-Origin-Resource-Policy: same-origin` is relaxed here for the
// same reason; without it a browser agent cannot read these documents.
const apiResponseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': EXPOSED_HEADERS,
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  Link: '</openapi.json>; rel="service-desc", </api>; rel="service-doc"',
}

const versionedApiResponseHeaders = {
  ...apiResponseHeaders,
  'API-Version': API_VERSION,
}

// The documents outside the versioned API are public too, and openapi.json is
// the one a browser agent reaches for first.
const MACHINE_READABLE_DOCUMENT_PATTERN =
  '^/(?:openapi\\.json|llms\\.txt|llms-full\\.txt|sitemap\\.xml|blog/rss\\.xml|\\.well-known/mcp|.+\\.md)$'

const documentResponseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': EXPOSED_HEADERS,
  'Cross-Origin-Resource-Policy': 'cross-origin',
}

const NEGOTIATED_VARY = 'Accept, Accept-Encoding'

const markdownResponseHeaders = {
  'Content-Type': 'text/markdown; charset=utf-8',
  Vary: NEGOTIATED_VARY,
}

const acceptsMediaType = mediaType => [
  { type: 'header', key: 'accept', value: `.*${mediaType}.*` },
]

// NOTE: Newsletter and the playground editor render as HTML only; every other
// extensionless page has a prerendered `.md` sibling. Excluding the two here
// lets an `Accept: text/markdown` request for them fall back to HTML instead
// of turning an existing page into a 404. `/404` is excluded so the error
// document is never served with a 200 status.
const MARKDOWN_PAGE_PATTERN =
  '^/(?!playground(?:/|$)|newsletter(?:/|$)|404(?:/|$)|api/v1(?:/|$))([^.]+?)/?$'

// NOTE: OG cards and blog post images render on other origins by design:
// share-preview testers hotlink the card, and feed readers hotlink the RSS
// enclosure and article images. The blanket same-origin resource policy makes
// browsers refuse those loads, so these paths override it. Later `continue`
// routes win when both match, so the override must sit after the blanket
// route.
const EMBEDDABLE_IMAGE_PATTERN =
  '^/(?:og/.*\\.png|blog/.*\\.(?:avif|gif|jpe?g|png|svg|webp))$'

export const websiteVercelConfig = channel => {
  if (channel !== 'production' && channel !== 'canary') {
    throw new Error(`Unknown website deployment channel: ${channel}`)
  }

  return {
    version: 3,
    routes: [
      {
        src: '^/api/v1(?:/.*)?$',
        methods: WRITE_METHODS,
        dest: METHOD_NOT_ALLOWED_PROBLEM_PATH,
        status: 405,
        headers: {
          ...sharedResponseHeaders(channel),
          ...versionedApiResponseHeaders,
          'Content-Type': PROBLEM_CONTENT_TYPE,
          Allow: READ_METHODS,
        },
      },
      {
        src: '^/api(?:/.*)?$',
        methods: WRITE_METHODS,
        dest: METHOD_NOT_ALLOWED_PROBLEM_PATH,
        status: 405,
        headers: {
          ...sharedResponseHeaders(channel),
          ...apiResponseHeaders,
          'Content-Type': PROBLEM_CONTENT_TYPE,
          Allow: READ_METHODS,
        },
      },
      {
        src: '^/api/v1(?:/.*)?$',
        methods: ['OPTIONS'],
        status: 204,
        headers: {
          ...sharedResponseHeaders(channel),
          ...versionedApiResponseHeaders,
          Allow: READ_METHODS,
          'Access-Control-Allow-Methods': READ_METHODS,
          'Access-Control-Allow-Headers': 'Accept, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      },
      {
        src: '^/api(?:/.*)?$',
        methods: ['OPTIONS'],
        status: 204,
        headers: {
          ...sharedResponseHeaders(channel),
          ...apiResponseHeaders,
          Allow: READ_METHODS,
          'Access-Control-Allow-Methods': READ_METHODS,
          'Access-Control-Allow-Headers': 'Accept, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      },
      {
        src: '^/og/(.*)\\.png$',
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
        continue: true,
      },
      {
        src: '^/$',
        headers: {
          Link: '</sitemap.xml>; rel="sitemap", </introduction/why-foldkit>; rel="about", </get-started>; rel="help", </example-apps>; rel="related", </ai/overview>; rel="describedby", </openapi.json>; rel="service-desc"',
        },
        continue: true,
      },
      {
        src: '^/.+\\.md$',
        headers: {
          ...markdownResponseHeaders,
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
        continue: true,
      },
      {
        src: '^/\\.well-known/mcp$',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        continue: true,
      },
      {
        src: '^/playground/.*',
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
        continue: true,
      },
      {
        src: '^/monacoworkers/.*',
        headers: {
          'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        continue: true,
      },
      {
        src: '.*',
        headers: sharedResponseHeaders(channel),
        continue: true,
      },
      {
        src: EMBEDDABLE_IMAGE_PATTERN,
        headers: {
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
        continue: true,
      },
      {
        src: '^/api/v1(?:/.*)?$',
        headers: versionedApiResponseHeaders,
        continue: true,
      },
      {
        src: MACHINE_READABLE_DOCUMENT_PATTERN,
        headers: documentResponseHeaders,
        continue: true,
      },
      {
        src: '^/assets/(.*)',
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        continue: true,
      },
      {
        src: '^/([^.]*)$',
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
          Vary: NEGOTIATED_VARY,
        },
        continue: true,
      },
      {
        src: '^/developers/?$',
        status: 308,
        headers: { Location: '/ai/overview' },
      },
      {
        src: '^/manifesto/?$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit' },
      },
      {
        src: '^/manifesto\\.md$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit.md' },
      },
      {
        src: '^/get-started/manifesto/?$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit' },
      },
      {
        src: '^/get-started/manifesto\\.md$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit.md' },
      },
      {
        src: '^/get-started/why-foldkit/?$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit' },
      },
      {
        src: '^/get-started/why-foldkit\\.md$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit.md' },
      },
      {
        src: '^/roadmap/?$',
        status: 308,
        headers: { Location: '/introduction/roadmap' },
      },
      {
        src: '^/roadmap\\.md$',
        status: 308,
        headers: { Location: '/introduction/roadmap.md' },
      },
      {
        src: '^/getting-started$',
        status: 308,
        headers: { Location: '/get-started' },
      },
      {
        src: '^/getting-started\\.md$',
        status: 308,
        headers: { Location: '/get-started.md' },
      },
      {
        src: '^/get-started/getting-started/?$',
        status: 308,
        headers: { Location: '/get-started' },
      },
      {
        src: '^/get-started/getting-started\\.md$',
        status: 308,
        headers: { Location: '/get-started.md' },
      },
      {
        src: '^/(?:faq/)?why-no-jsx/?$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit' },
      },
      {
        src: '^/(?:faq/)?why-no-jsx\\.md$',
        status: 308,
        headers: { Location: '/introduction/why-foldkit.md' },
      },
      {
        src: '^/what-about-ssr$',
        status: 308,
        headers: { Location: '/core/server-rendering' },
      },
      {
        src: '^/what-about-ssr\\.md$',
        status: 308,
        headers: { Location: '/core/server-rendering.md' },
      },
      {
        src: '^/faq/what-about-ssr$',
        status: 308,
        headers: { Location: '/core/server-rendering' },
      },
      {
        src: '^/faq/what-about-ssr\\.md$',
        status: 308,
        headers: { Location: '/core/server-rendering.md' },
      },
      {
        src: '^/coming-from-react$',
        status: 308,
        headers: { Location: '/react/coming-from-react' },
      },
      {
        src: '^/coming-from-react\\.md$',
        status: 308,
        headers: { Location: '/react/coming-from-react.md' },
      },
      {
        src: '^/foldkit-vs-react-side-by-side$',
        status: 308,
        headers: { Location: '/react/foldkit-vs-react-side-by-side' },
      },
      {
        src: '^/foldkit-vs-react-side-by-side\\.md$',
        status: 308,
        headers: { Location: '/react/foldkit-vs-react-side-by-side.md' },
      },
      {
        src: '^/routing-and-navigation$',
        status: 308,
        headers: { Location: '/core/routing-and-navigation' },
      },
      {
        src: '^/routing-and-navigation\\.md$',
        status: 308,
        headers: { Location: '/core/routing-and-navigation.md' },
      },
      {
        src: '^/field-validation$',
        status: 308,
        headers: { Location: '/core/field-validation' },
      },
      {
        src: '^/field-validation\\.md$',
        status: 308,
        headers: { Location: '/core/field-validation.md' },
      },
      {
        src: '^/project-organization$',
        status: 308,
        headers: { Location: '/patterns/project-organization' },
      },
      {
        src: '^/project-organization\\.md$',
        status: 308,
        headers: { Location: '/patterns/project-organization.md' },
      },
      {
        src: '^/example-apps/upload$',
        status: 308,
        headers: { Location: '/example-apps/interrupting-commands' },
      },
      {
        src: '^/playground/upload$',
        status: 308,
        headers: { Location: '/playground/interrupting-commands' },
      },
      {
        src: '^/example-apps/checkout-machine$',
        status: 308,
        headers: { Location: '/example-apps/state-machine' },
      },
      {
        src: '^/example-apps/checkout-machine\\.md$',
        status: 308,
        headers: { Location: '/example-apps/state-machine.md' },
      },
      {
        src: '^/playground/checkout-machine$',
        status: 308,
        headers: { Location: '/playground/state-machine' },
      },
      {
        src: '^/blog/foldkit-has-server-rendering-now$',
        status: 308,
        headers: { Location: '/blog/foldkit-has-server-rendering' },
      },
      {
        src: '^/blog/foldkit-has-server-rendering-now\\.md$',
        status: 308,
        headers: { Location: '/blog/foldkit-has-server-rendering.md' },
      },
      {
        src: '^/$',
        has: acceptsMediaType('text/markdown'),
        dest: '/index.md',
        headers: markdownResponseHeaders,
      },
      {
        src: MARKDOWN_PAGE_PATTERN,
        has: acceptsMediaType('text/markdown'),
        dest: '/$1.md',
        headers: markdownResponseHeaders,
      },
      {
        src: '^/api/v1/?$',
        dest: `${API_BASE_PATH}/index.json`,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      },
      {
        src: '^/api/v1/page\\.json$',
        has: [
          {
            type: 'query',
            key: 'path',
            value: '^(?<page>[a-z0-9-]+(?:/[a-z0-9-]+)*)$',
          },
        ],
        dest: `${API_BASE_PATH}/pages/$page.json`,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      },
      {
        src: '^/page\\.md$',
        has: [
          {
            type: 'query',
            key: 'path',
            value: '^(?<page>[a-z0-9-]+(?:/[a-z0-9-]+)*)$',
          },
        ],
        dest: '/$page.md',
        headers: markdownResponseHeaders,
      },
      { handle: 'filesystem' },
      {
        src: '/',
        has: [{ type: 'query', key: 'embedded', value: '(?<slug>[^&]+)' }],
        dest: '/example-apps-embed/$slug/index.html',
      },
      { src: '/playground/(.*)', dest: '/playground/index.html' },
      {
        src: '^/api/v1(?:/.*)?$',
        dest: NOT_FOUND_PROBLEM_PATH,
        status: 404,
        headers: {
          ...versionedApiResponseHeaders,
          'Content-Type': PROBLEM_CONTENT_TYPE,
        },
      },
      {
        src: '^/api/.+',
        dest: NOT_FOUND_PROBLEM_PATH,
        status: 404,
        headers: {
          ...apiResponseHeaders,
          'Content-Type': PROBLEM_CONTENT_TYPE,
        },
      },
      {
        src: '/(.*)',
        has: acceptsMediaType('json'),
        dest: '/404.json',
        status: 404,
        headers: {
          'Content-Type': PROBLEM_CONTENT_TYPE,
          Vary: NEGOTIATED_VARY,
        },
      },
      {
        src: '/(.*)',
        has: acceptsMediaType('text/html'),
        dest: '/404.html',
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          Vary: NEGOTIATED_VARY,
        },
      },
      {
        src: '/(.*)',
        dest: '/404.md',
        status: 404,
        headers: markdownResponseHeaders,
      },
    ],
  }
}

export const writeWebsiteVercelConfig = (channel, outputPath) => {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(
    outputPath,
    JSON.stringify(websiteVercelConfig(channel), null, 2) + '\n',
  )
}

const entryPath = process.argv.at(1)
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(entryPath)).href
) {
  const channel = process.argv.at(2)
  if (channel === undefined) {
    throw new Error('Pass the website deployment channel.')
  }
  writeWebsiteVercelConfig(
    channel,
    resolve(process.cwd(), '.vercel/output/config.json'),
  )
}
