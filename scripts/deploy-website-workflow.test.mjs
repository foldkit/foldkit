import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { websiteVercelConfig } from './website-vercel-config.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const productionWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website.yml'),
  'utf8',
)
const canaryWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website-canary.yml'),
  'utf8',
)
const buildWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website-build.yml'),
  'utf8',
)
const openApiSpec = JSON.parse(
  readFileSync(
    resolve(REPO_ROOT, 'packages/website/public/openapi.json'),
    'utf8',
  ),
)
const productionConfig = websiteVercelConfig('production')
const canaryConfig = websiteVercelConfig('canary')

const requestUrl = target => new URL(target, 'https://foldkit.dev')

const matchingRoutesFor = (config, target) => {
  const { pathname } = requestUrl(target)

  return config.routes.filter(
    route =>
      typeof route.src === 'string' && new RegExp(route.src).test(pathname),
  )
}

const headersFor = (config, pathname) =>
  matchingRoutesFor(config, pathname).reduce(
    (headers, route) => ({ ...headers, ...route.headers }),
    {},
  )

const isolationHeadersFor = (config, pathname) =>
  Object.fromEntries(
    Object.entries(headersFor(config, pathname)).filter(([name]) =>
      name.startsWith('Cross-Origin-'),
    ),
  )

// NOTE: a minimal model of Vercel's routing phases: initial routes run in order
// (accumulating headers from `continue` routes, stopping on a redirect or a
// rewrite), the filesystem serves exact files and directory indexes, and the
// routes after `handle: filesystem` decide what a missing file becomes.
const DEPLOYED_FILES = new Set([
  'index.html',
  'index.md',
  '404.html',
  '404.md',
  '404.json',
  'core/model/index.html',
  'core/model.md',
  'og/core-model.png',
  'blog/dispatch-1/cover.webp',
  'newsletter/index.html',
  'playground/index.html',
  'playground/counter/index.html',
  'get-started/index.html',
  'get-started.md',
  'llms.txt',
  'llms-full.txt',
  'sitemap.xml',
  'openapi.json',
  '.well-known/mcp',
  'blog/rss.xml',
  'api/index.html',
  'api/v1/index.json',
  'api/v1/pages.json',
  'api/v1/sections.json',
  'api/v1/pages/core/model.json',
  'api/v1/examples.json',
  'api/v1/blog.json',
  'api/v1/errors/not-found.json',
  'api/v1/errors/method-not-allowed.json',
  'about/index.html',
  'about.md',
  'contact/index.html',
  'contact.md',
  'privacy/index.html',
  'privacy.md',
  'api.md',
])

const splitPhases = routes => {
  const filesystemIndex = routes.findIndex(
    route => route.handle === 'filesystem',
  )
  assert.notEqual(filesystemIndex, -1)
  return {
    initial: routes.slice(0, filesystemIndex),
    postFilesystem: routes.slice(filesystemIndex + 1),
  }
}

const routeMatches = (route, pathname, searchParams, accept, method) => {
  if (typeof route.src !== 'string') {
    return false
  }
  if (!new RegExp(route.src).test(pathname)) {
    return false
  }
  if (route.methods !== undefined && !route.methods.includes(method)) {
    return false
  }
  if (route.has === undefined) {
    return true
  }
  return route.has.every(condition => {
    if (condition.type === 'header' && condition.key === 'accept') {
      return new RegExp(condition.value).test(accept)
    }

    if (condition.type === 'query') {
      const value = searchParams.get(condition.key)
      return value !== null && new RegExp(condition.value).test(value)
    }

    return false
  })
}

const applyDest = (route, pathname, searchParams) => {
  const captures = new RegExp(route.src).exec(pathname)
  let destination = route.dest.replace(
    /\$(\d)/g,
    (_, index) => captures[Number(index)],
  )

  for (const condition of route.has ?? []) {
    if (condition.type !== 'query') {
      continue
    }

    const value = searchParams.get(condition.key)
    const queryCaptures =
      value === null ? undefined : new RegExp(condition.value).exec(value)

    for (const [name, captured] of Object.entries(
      queryCaptures?.groups ?? {},
    )) {
      destination = destination.replaceAll(`$${name}`, captured)
    }
  }

  return destination
}

const filesystemFileFor = pathname => {
  const relative = pathname.replace(/^\//, '')
  const directory = relative.replace(/\/$/, '')
  if (directory === '' && DEPLOYED_FILES.has('index.html')) {
    return 'index.html'
  }
  if (DEPLOYED_FILES.has(relative)) {
    return relative
  }
  if (DEPLOYED_FILES.has(`${directory}/index.html`)) {
    return `${directory}/index.html`
  }
  return undefined
}

const resolveRequest = (config, target, accept = '*/*', method = 'GET') => {
  const { initial, postFilesystem } = splitPhases(config.routes)
  const headers = {}
  const url = requestUrl(target)
  const { searchParams } = url
  let currentPath = url.pathname
  let rewrittenStatus = undefined

  for (const route of initial) {
    if (!routeMatches(route, currentPath, searchParams, accept, method)) {
      continue
    }
    Object.assign(headers, route.headers)
    if (route.status !== undefined && route.dest === undefined) {
      if (route.headers?.Location !== undefined) {
        return {
          kind: 'redirect',
          status: route.status,
          location: route.headers.Location,
        }
      }
      return { kind: 'status', status: route.status, headers }
    }
    if (route.dest !== undefined) {
      currentPath = applyDest(route, currentPath, searchParams)
      rewrittenStatus = route.status
      break
    }
    if (route.continue !== true) {
      break
    }
  }

  const initialMatch = filesystemFileFor(currentPath)
  if (initialMatch !== undefined) {
    return {
      kind: 'file',
      servedFile: initialMatch,
      status: rewrittenStatus ?? 200,
      headers,
    }
  }

  for (const route of postFilesystem) {
    if (!routeMatches(route, currentPath, searchParams, accept, method)) {
      continue
    }
    Object.assign(headers, route.headers)
    if (route.dest !== undefined) {
      const servedFile = filesystemFileFor(
        applyDest(route, currentPath, searchParams),
      )
      assert.notEqual(
        servedFile,
        undefined,
        `Fallback dest ${route.dest} names a file the build does not emit.`,
      )
      return { kind: 'file', servedFile, status: route.status ?? 200, headers }
    }
    if (route.continue !== true) {
      break
    }
  }

  return { kind: 'miss', status: 404, headers }
}

test('the deployed playground and Monaco workers share an embedder policy', () => {
  assert.deepEqual(isolationHeadersFor(productionConfig, '/playground/ssr'), {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  assert.deepEqual(
    isolationHeadersFor(productionConfig, '/monacoworkers/ts.worker.bundle.js'),
    {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  )
  const workerEmbedderRoutes = matchingRoutesFor(
    productionConfig,
    '/monacoworkers/ts.worker.bundle.js',
  ).filter(
    route => route.headers?.['Cross-Origin-Embedder-Policy'] !== undefined,
  )
  assert.equal(workerEmbedderRoutes.length, 1)
  assert.equal(
    workerEmbedderRoutes.every(route => route.continue === true),
    true,
  )
})

test('share images stay embeddable from other origins', () => {
  const ogCard = resolveRequest(productionConfig, '/og/core-model.png')
  assert.equal(ogCard.servedFile, 'og/core-model.png')
  assert.deepEqual(ogCard.headers, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'RateLimit-Policy': '"default";q=600;w=60',
    RateLimit: '"default";r=600;t=60',
  })

  const canaryOgCard = resolveRequest(canaryConfig, '/og/core-model.png')
  assert.equal(
    canaryOgCard.headers['Cross-Origin-Resource-Policy'],
    'cross-origin',
  )

  const cover = resolveRequest(productionConfig, '/blog/dispatch-1/cover.webp')
  assert.equal(cover.servedFile, 'blog/dispatch-1/cover.webp')
  assert.equal(cover.headers['Cross-Origin-Resource-Policy'], 'cross-origin')

  const page = resolveRequest(productionConfig, '/core/model', 'text/html')
  assert.equal(page.headers['Cross-Origin-Resource-Policy'], 'same-origin')

  const feed = resolveRequest(productionConfig, '/blog/rss.xml')
  assert.equal(feed.headers['Cross-Origin-Resource-Policy'], 'cross-origin')
})

test('unknown paths return a real 404 in the format the client asked for', () => {
  const asAgent = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
  )
  assert.equal(asAgent.status, 404)
  assert.equal(asAgent.servedFile, '404.md')
  assert.equal(asAgent.headers['Content-Type'], 'text/markdown; charset=utf-8')

  const asBrowser = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  )
  assert.equal(asBrowser.status, 404)
  assert.equal(asBrowser.servedFile, '404.html')

  const asJsonClient = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
    'application/json',
  )
  assert.equal(asJsonClient.status, 404)
  assert.equal(asJsonClient.servedFile, '404.json')
  assert.equal(
    asJsonClient.headers['Content-Type'],
    'application/problem+json; charset=utf-8',
  )

  const asProblemClient = resolveRequest(
    productionConfig,
    '/some-path-that-does-not-exist',
    'application/problem+json',
  )
  assert.equal(asProblemClient.status, 404)
  assert.equal(asProblemClient.servedFile, '404.json')
})

test('the content API answers unknown paths with a problem document', () => {
  for (const accept of ['*/*', 'text/html', 'application/json']) {
    const result = resolveRequest(productionConfig, '/api/v1/nope.json', accept)
    assert.equal(result.status, 404, accept)
    assert.equal(result.servedFile, 'api/v1/errors/not-found.json', accept)
    assert.equal(
      result.headers['Content-Type'],
      'application/problem+json; charset=utf-8',
      accept,
    )
    assert.equal(result.headers['API-Version'], 'v1', accept)
  }
})

test('unknown API versions do not claim to be v1', () => {
  const result = resolveRequest(productionConfig, '/api/v2/pages.json')

  assert.equal(result.status, 404)
  assert.equal(result.servedFile, 'api/v1/errors/not-found.json')
  assert.equal(result.headers['API-Version'], undefined)
  assert.equal(result.headers['Access-Control-Allow-Origin'], '*')
})

test('the content API rejects write methods with 405 and an Allow header', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const result = resolveRequest(
      productionConfig,
      '/api/v1/pages.json',
      '*/*',
      method,
    )
    assert.equal(result.status, 405, method)
    assert.equal(
      result.servedFile,
      'api/v1/errors/method-not-allowed.json',
      method,
    )
    assert.equal(result.headers.Allow, 'GET, HEAD, OPTIONS', method)
    assert.equal(
      result.headers['Content-Type'],
      'application/problem+json; charset=utf-8',
      method,
    )
  }

  const preflight = resolveRequest(
    productionConfig,
    '/api/v1/pages.json',
    '*/*',
    'OPTIONS',
  )
  assert.equal(preflight.status, 204)
  assert.equal(
    preflight.headers['Access-Control-Allow-Methods'],
    'GET, HEAD, OPTIONS',
  )
})

test('content API responses expose the headers agents are told to read', () => {
  const headers = resolveRequest(productionConfig, '/api/v1/pages.json').headers
  const exposed = headers['Access-Control-Expose-Headers'].split(', ')

  for (const name of [
    'API-Version',
    'RateLimit',
    'RateLimit-Policy',
    'Allow',
    'Link',
    'Deprecation',
    'Sunset',
  ]) {
    assert.ok(
      exposed.includes(name),
      `${name} is set but not exposed to cross-origin readers`,
    )
  }
})

test('the machine-readable documents are readable cross-origin too', () => {
  for (const pathname of [
    '/openapi.json',
    '/llms.txt',
    '/llms-full.txt',
    '/sitemap.xml',
    '/blog/rss.xml',
    '/.well-known/mcp',
    '/core/model.md',
  ]) {
    const headers = resolveRequest(productionConfig, pathname).headers
    assert.equal(headers['Access-Control-Allow-Origin'], '*', pathname)
    assert.equal(
      headers['Cross-Origin-Resource-Policy'],
      'cross-origin',
      pathname,
    )
    assert.ok(headers['Access-Control-Expose-Headers'], pathname)
  }
})

test('the documentation page answers write methods the way the API does', () => {
  for (const pathname of ['/api', '/api/']) {
    const result = resolveRequest(productionConfig, pathname, '*/*', 'POST')
    assert.equal(result.status, 405, pathname)
    assert.equal(result.headers.Allow, 'GET, HEAD, OPTIONS', pathname)
    assert.equal(result.headers['API-Version'], undefined, pathname)
  }

  const documentation = resolveRequest(productionConfig, '/api/')
  assert.equal(documentation.status, 200)
  assert.equal(documentation.servedFile, 'api/index.html')
})

test('the preflight carries the same policy headers as every other response', () => {
  const preflight = resolveRequest(
    productionConfig,
    '/api/v1/pages.json',
    '*/*',
    'OPTIONS',
  )

  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers['RateLimit-Policy'], '"default";q=600;w=60')

  const canaryPreflight = resolveRequest(
    canaryConfig,
    '/api/v1/pages.json',
    '*/*',
    'OPTIONS',
  )

  assert.equal(canaryPreflight.headers['X-Robots-Tag'], 'noindex, nofollow')
})

test('content API responses are readable cross-origin and name their version', () => {
  for (const pathname of [
    '/api/v1/pages.json',
    '/api/v1/examples.json',
    '/api/v1/blog.json',
  ]) {
    const result = resolveRequest(productionConfig, pathname)
    assert.equal(result.status, 200, pathname)
    assert.equal(result.headers['API-Version'], 'v1', pathname)
    assert.equal(result.headers['Access-Control-Allow-Origin'], '*', pathname)
    assert.equal(
      result.headers['Cross-Origin-Resource-Policy'],
      'cross-origin',
      pathname,
    )
    assert.match(result.headers.Link, /rel="service-desc"/, pathname)
  }
})

test('the versioned base path serves the service index', () => {
  for (const pathname of ['/api/v1', '/api/v1/']) {
    const result = resolveRequest(productionConfig, pathname)
    assert.equal(result.status, 200, pathname)
    assert.equal(result.servedFile, 'api/v1/index.json', pathname)
    assert.equal(
      result.headers['Content-Type'],
      'application/json; charset=utf-8',
      pathname,
    )
  }

  const documentation = resolveRequest(productionConfig, '/api')
  assert.equal(documentation.status, 200)
  assert.equal(documentation.servedFile, 'api/index.html')
})

test('getPage carries nested page paths in a query parameter', () => {
  const result = resolveRequest(
    productionConfig,
    '/api/v1/page.json?path=core%2Fmodel',
  )

  assert.equal(result.status, 200)
  assert.equal(result.servedFile, 'api/v1/pages/core/model.json')
  assert.equal(result.headers['API-Version'], 'v1')
  assert.equal(
    result.headers['Content-Type'],
    'application/json; charset=utf-8',
  )
})

test('getPageMarkdown carries nested page paths in a query parameter', () => {
  const result = resolveRequest(productionConfig, '/page.md?path=core%2Fmodel')

  assert.equal(result.status, 200)
  assert.equal(result.servedFile, 'core/model.md')
  assert.equal(result.headers['Content-Type'], 'text/markdown; charset=utf-8')
  assert.equal(result.headers['API-Version'], undefined)
})

test('every response advertises the advisory rate limit policy', () => {
  for (const config of [productionConfig, canaryConfig]) {
    for (const pathname of [
      '/',
      '/api/v1/pages.json',
      '/openapi.json',
      '/llms.txt',
    ]) {
      const headers = resolveRequest(config, pathname).headers
      assert.equal(
        headers['RateLimit-Policy'],
        '"default";q=600;w=60',
        pathname,
      )
      assert.equal(headers.RateLimit, '"default";r=600;t=60', pathname)
    }
  }
})

test('markdown negotiation leaves the JSON-only content API alone', () => {
  const result = resolveRequest(productionConfig, '/api/v1', 'text/markdown')
  assert.equal(result.status, 200)
  assert.equal(result.servedFile, 'api/v1/index.json')

  const documentation = resolveRequest(
    productionConfig,
    '/api',
    'text/markdown',
  )
  assert.equal(documentation.status, 200)
  assert.equal(documentation.servedFile, 'api.md')
})

test('every 404 variant tells caches the response depends on Accept', () => {
  for (const accept of ['*/*', 'text/html', 'application/json']) {
    const result = resolveRequest(productionConfig, '/nope', accept)
    assert.equal(result.status, 404)
    assert.match(result.headers.Vary, /Accept\b/)
  }
})

test('Accept: text/markdown negotiates the markdown variant of a page', () => {
  const page = resolveRequest(productionConfig, '/core/model', 'text/markdown')
  assert.equal(page.status, 200)
  assert.equal(page.servedFile, 'core/model.md')
  assert.equal(page.headers['Content-Type'], 'text/markdown; charset=utf-8')
  assert.match(page.headers.Vary, /Accept\b/)

  const home = resolveRequest(productionConfig, '/', 'text/markdown')
  assert.equal(home.servedFile, 'index.md')
  assert.equal(home.headers['Content-Type'], 'text/markdown; charset=utf-8')

  const trailingSlash = resolveRequest(
    productionConfig,
    '/core/model/',
    'text/markdown',
  )
  assert.equal(trailingSlash.servedFile, 'core/model.md')
})

test('HTML page responses carry Vary: Accept so caches keep variants apart', () => {
  const page = resolveRequest(productionConfig, '/core/model', 'text/html')
  assert.equal(page.status, 200)
  assert.equal(page.servedFile, 'core/model/index.html')
  assert.match(page.headers.Vary, /Accept\b/)

  const markdownFile = resolveRequest(productionConfig, '/core/model.md')
  assert.equal(markdownFile.servedFile, 'core/model.md')
  assert.equal(
    markdownFile.headers['Content-Type'],
    'text/markdown; charset=utf-8',
  )
  assert.match(markdownFile.headers.Vary, /Accept\b/)
})

test('pages without a markdown variant fall back to HTML instead of 404', () => {
  for (const pathname of ['/newsletter', '/newsletter/']) {
    const newsletter = resolveRequest(
      productionConfig,
      pathname,
      'text/markdown',
    )
    assert.equal(newsletter.status, 200, pathname)
    assert.equal(newsletter.servedFile, 'newsletter/index.html', pathname)
  }

  const playground = resolveRequest(
    productionConfig,
    '/playground/counter',
    'text/markdown',
  )
  assert.equal(playground.status, 200)
  assert.equal(playground.servedFile, 'playground/counter/index.html')
})

test('a nonexistent .md path answers a browser with HTML, not markdown', () => {
  const result = resolveRequest(
    productionConfig,
    '/renamed-page.md',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  )
  assert.equal(result.status, 404)
  assert.equal(result.servedFile, '404.html')
  assert.equal(result.headers['Content-Type'], 'text/html; charset=utf-8')
})

test('/404 never answers 200, whatever format the client asks for', () => {
  const asAgent = resolveRequest(productionConfig, '/404', 'text/markdown')
  assert.equal(asAgent.status, 404)
  assert.equal(asAgent.servedFile, '404.md')

  const asBrowser = resolveRequest(productionConfig, '/404', 'text/html')
  assert.equal(asBrowser.status, 404)
  assert.equal(asBrowser.servedFile, '404.html')
})

test('unknown playground slugs still load the shared editor shell', () => {
  const result = resolveRequest(productionConfig, '/playground/unknown-slug')
  assert.equal(result.status, 200)
  assert.equal(result.servedFile, 'playground/index.html')
})

test('the developer portal path redirects to the AI overview', () => {
  const result = resolveRequest(productionConfig, '/developers')
  assert.equal(result.kind, 'redirect')
  assert.equal(result.status, 308)
  assert.equal(result.location, '/ai/overview')
  assert.equal(
    resolveRequest(productionConfig, '/developers/').location,
    '/ai/overview',
  )
})

test('the old manifesto paths redirect to Why Foldkit', () => {
  for (const pathname of [
    '/manifesto',
    '/manifesto/',
    '/get-started/manifesto',
    '/get-started/manifesto/',
  ]) {
    const result = resolveRequest(productionConfig, pathname)
    assert.equal(result.kind, 'redirect', pathname)
    assert.equal(result.status, 308, pathname)
    assert.equal(result.location, '/introduction/why-foldkit', pathname)
  }

  for (const pathname of ['/manifesto.md', '/get-started/manifesto.md']) {
    const result = resolveRequest(productionConfig, pathname)
    assert.equal(result.kind, 'redirect', pathname)
    assert.equal(result.status, 308, pathname)
    assert.equal(result.location, '/introduction/why-foldkit.md', pathname)
  }
})

test('the MCP manifest and OpenAPI description are served as JSON', () => {
  const manifest = resolveRequest(productionConfig, '/.well-known/mcp')
  assert.equal(manifest.status, 200)
  assert.equal(manifest.servedFile, '.well-known/mcp')
  assert.equal(
    manifest.headers['Content-Type'],
    'application/json; charset=utf-8',
  )

  const spec = resolveRequest(productionConfig, '/openapi.json')
  assert.equal(spec.status, 200)
  assert.equal(spec.servedFile, 'openapi.json')
})

test('the homepage advertises the OpenAPI description in its Link header', () => {
  assert.match(
    headersFor(productionConfig, '/').Link,
    /<\/openapi\.json>; rel="service-desc"/,
  )
})

test('the rate limit headers match what openapi.json documents', () => {
  const headers = productionConfig.routes.find(
    route => route.src === '.*',
  ).headers

  assert.equal(
    headers['RateLimit-Policy'],
    openApiSpec.components.headers.RateLimitPolicy.example,
  )
  assert.equal(
    headers.RateLimit,
    openApiSpec.components.headers.RateLimit.example,
  )
})

test('error rewrites name problem documents the content API publishes', () => {
  const errorDestinations = productionConfig.routes
    .map(route => route.dest)
    .filter(dest => typeof dest === 'string' && dest.includes('/errors/'))

  assert.deepEqual([...new Set(errorDestinations)].sort(), [
    '/api/v1/errors/method-not-allowed.json',
    '/api/v1/errors/not-found.json',
  ])
})

test('the deploy workflow copies dotfiles like .well-known into the Vercel output', () => {
  assert.match(
    buildWorkflow,
    /cp -r packages\/website\/dist\/\. \.vercel\/output\/static\//,
  )
})

test('only the canary deployment blocks search indexing', () => {
  assert.equal(
    headersFor(productionConfig, '/get-started')['X-Robots-Tag'],
    undefined,
  )
  assert.equal(
    headersFor(canaryConfig, '/get-started')['X-Robots-Tag'],
    'noindex, nofollow',
  )
})

test('production and canary call the shared deployment with separate projects', () => {
  assert.match(
    productionWorkflow,
    /uses: \.\/\.github\/workflows\/deploy-website-build\.yml/,
  )
  assert.match(productionWorkflow, /channel: production/)
  assert.match(
    productionWorkflow,
    /vercel_project_id: \$\{\{ secrets\.VERCEL_WEBSITE_PROJECT_ID \}\}/,
  )

  assert.match(
    canaryWorkflow,
    /uses: \.\/\.github\/workflows\/deploy-website-build\.yml/,
  )
  assert.match(canaryWorkflow, /channel: canary/)
  assert.match(canaryWorkflow, /hostname: canary\.foldkit\.dev/)
  assert.match(
    canaryWorkflow,
    /vercel_project_id: \$\{\{ secrets\.VERCEL_WEBSITE_CANARY_PROJECT_ID \}\}/,
  )
  for (const workflow of [productionWorkflow, canaryWorkflow]) {
    assert.match(
      workflow,
      /website_book_font: \$\{\{ secrets\.ABC_FAVORIT_BOOK_WOFF2_BASE64 \}\}/,
    )
    assert.match(
      workflow,
      /website_light_font: \$\{\{ secrets\.ABC_FAVORIT_LIGHT_WOFF2_BASE64 \}\}/,
    )
  }
})

test('the canary hostname moves only after its staged deployment passes smoke tests', () => {
  const smokeIndex = buildWorkflow.indexOf(
    'Smoke the deployed SSR and SSG playgrounds',
  )
  const promotionIndex = buildWorkflow.indexOf('Promote the canary deployment')

  assert.notEqual(smokeIndex, -1)
  assert.notEqual(promotionIndex, -1)
  assert.ok(smokeIndex < promotionIndex)
  assert.match(buildWorkflow, /deploy --prebuilt --prod --skip-domain --token/)
  assert.match(buildWorkflow, /promote "\$DEPLOYMENT_URL" --yes --token/)
  assert.match(
    buildWorkflow,
    /- name: Verify the playground versions and peer ranges are published\n\s+if: inputs\.channel == 'production'/,
  )
})

test('production deployment requires the complete promoted npm snapshot', () => {
  assert.match(
    buildWorkflow,
    /- name: Verify the complete promoted package release\n\s+if: inputs\.channel == 'production'\n\s+run: pnpm release:verify-latest/,
  )
})

test('stable finalization deploys the exact published website commit', () => {
  assert.match(
    productionWorkflow,
    /ref: \$\{\{ inputs\.published_commit \|\| 'main' \}\}/,
  )
  assert.match(
    productionWorkflow,
    /node scripts\/plan-website-deploy\.mjs "\$\{target\}" "\$\{PUBLISHED_COMMIT:\+--allow-historical-target\}"/,
  )
  assert.match(
    productionWorkflow,
    /git merge-base --is-ancestor "\$\{expected\}" refs\/remotes\/origin\/main/,
  )
  assert.match(
    productionWorkflow,
    /target: \$\{\{ needs\.authorize\.outputs\.target \}\}/,
  )
  assert.match(
    productionWorkflow,
    /if \[ -n "\$\{PUBLISHED_COMMIT\}" \] && \[ "\$\{deploy\}" != 'true' \]; then\n\s+echo "the published website commit \$\{target\} is not eligible for deployment" >&2\n\s+exit 1\n\s+fi/,
  )
})

test('the registry-backed SSG playground build runs only for production', () => {
  assert.match(
    buildWorkflow,
    /- name: Build the exact transformed SSG playground\n\s+if: inputs\.channel == 'production'\n\s+run: pnpm check:playground-ssg-build/,
  )
})
