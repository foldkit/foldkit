import { Option, Predicate } from 'effect'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {
  type Server as HttpServer,
  createServer as createHttpServer,
  request as nodeRequest,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type CorsOptions,
  DevEnvironment,
  type Logger,
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
  createServer as createViteServer,
  isRunnableDevEnvironment,
} from 'vite'
import { createServer as createHostViteServer } from 'vite-host'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { foldkit } from '../src/index.ts'
import { foldkitSsr } from '../src/ssr.ts'
import { boundPort } from './boundPort.ts'

type RawResponse = Readonly<{
  status: number
  body: string
  headers: Readonly<Record<string, string>>
}>

// `fetch` normalizes a URL before sending it, so a request target that is not
// origin-form (an absolute URL, or a network-path reference such as
// `//evil.example/page`) can only be sent by writing it into the request line
// directly.
const requestWithTarget = (
  origin: string,
  target: string,
  options: Readonly<{
    method?: string
    body?: string
    headers?: Record<string, string>
  }> = {},
): Promise<RawResponse> =>
  new Promise((resolveResponse, reject) => {
    const { hostname, port } = new URL(origin)
    const clientRequest = nodeRequest(
      {
        hostname,
        port,
        path: target,
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
      },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () =>
          resolveResponse({
            status: response.statusCode ?? 0,
            body,
            headers: Object.fromEntries(
              Object.entries(response.headers).map(([name, value]) => [
                name,
                globalThis.Array.isArray(value)
                  ? value.join(', ')
                  : String(value ?? ''),
              ]),
            ),
          }),
        )
      },
    )
    clientRequest.on('error', reject)
    if (options.body !== undefined) {
      clientRequest.write(options.body)
    }
    clientRequest.end()
  })

// A logger that keeps warnings, so a test can assert what the plugin told the
// developer rather than only what it did.
const collectingLogger = (warnings: Array<string>): Logger => ({
  info: () => {},
  warn: message => {
    warnings.push(message)
  },
  warnOnce: message => {
    warnings.push(message)
  },
  error: () => {},
  clearScreen: () => {},
  hasErrorLogged: () => false,
  hasWarned: false,
})

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/ssr')
const AUTOMATIC_IDENTITY_FIXTURE_ROOT = resolve(
  import.meta.dirname,
  'fixtures/build-config',
)
const HOT_DISPOSE_FIXTURE_ROOT = resolve(
  import.meta.dirname,
  'fixtures/ssr-hot-dispose',
)
const FOLDKIT_PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.resolve('foldkit'))),
  '..',
)
const EFFECT_PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.resolve('effect'))),
  '..',
)
const ENTRY_EVALUATED_EVENT = 'fixture:evaluated-entry'
const SERVER_UPDATE_SETTLED_EVENT = 'foldkit:server-update-settled'
const HOT_UPDATE_TIMEOUT_MS = 2_000
const FOLDKIT_BUILD_TOKEN_URL = `/@fs${resolve(
  dirname(fileURLToPath(import.meta.resolve('foldkit'))),
  'buildToken.js',
)}`
const AGGREGATE_DEV_SERVER_TEST_TIMEOUT_MS = 20_000
const originOf = (address: AddressInfo | string | null | undefined): string =>
  `http://127.0.0.1:${Option.getOrThrowWith(
    boundPort(address),
    () => new Error('The server has no bound port'),
  )}`

const closeHttpServer = (server: HttpServer): Promise<void> =>
  new Promise((resolveClose, reject) => {
    server.close(error => {
      if (error === undefined) {
        resolveClose()
      } else {
        reject(error)
      }
    })
  })

const startProxyTarget = async (): Promise<string> => {
  const server = createHttpServer((request, response) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', chunk => {
      body += chunk
    })
    request.on('end', () => {
      response.statusCode = 218
      response.setHeader('content-type', 'text/plain')
      response.setHeader('x-request-owner', 'proxy')
      response.end(`${request.method ?? 'GET'}:${request.url ?? ''}:${body}`)
    })
  })
  onTestFinished(() => closeHttpServer(server).catch(() => undefined))
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })

  return originOf(server.address())
}

// A field already on the node response when the plugin's middleware runs.
// The plugin separates Vite-owned CORS from application responses, so the merge
// is exercised against a field seeded here instead of one Vite leaves behind.
const seedVaryPlugin = (fieldName: string) => ({
  name: 'seed-vary',
  configureServer: (server: {
    middlewares: {
      use: (
        handler: (
          request: unknown,
          response: unknown,
          next: () => void,
        ) => void,
      ) => void
    }
  }) => {
    server.middlewares.use((_request, response, next) => {
      const nodeResponse: { setHeader: (name: string, value: string) => void } =
        response as never
      nodeResponse.setHeader('vary', fieldName)
      next()
    })
  },
})

const allowedHostsConfiguration = (
  allowedHosts: true | ReadonlyArray<string> | undefined,
): Readonly<{ allowedHosts?: true | Array<string> }> => {
  if (allowedHosts === undefined) {
    return {}
  } else if (allowedHosts === true) {
    return { allowedHosts: true }
  } else {
    return { allowedHosts: [...allowedHosts] }
  }
}

// A second physical copy of Vite, installed under an alias, so a server it
// creates carries that copy's `RunnableDevEnvironment` class rather than the
// one this test and the plugin import. Its `createServer` is nominally typed
// against its own copy, and the dev-server contract is what both copies share.
const createHostServer =
  createHostViteServer as unknown as typeof createViteServer

// Proves the host server really is another copy: Vite's own `instanceof`
// check, imported here, does not recognize the environment the host created.
const foreignCopyAssertionPlugin: Plugin = {
  name: 'test:foreign-copy-assertion',
  configureServer: server => {
    expect(isRunnableDevEnvironment(server.environments.ssr)).toBe(false)
  },
}

// Stands in for a host plugin that backs the `ssr` environment with its own
// runtime, such as a Workers plugin running the entry in workerd: the
// environment is a plain `DevEnvironment`, so it has no module runner.
const nonRunnableSsrPlugin: Plugin = {
  name: 'test:non-runnable-ssr',
  config: () => ({
    environments: {
      ssr: {
        dev: {
          createEnvironment: (name: string, config: ResolvedConfig) =>
            new DevEnvironment(name, config, { hot: false }),
        },
      },
    },
  }),
}

const startServer = async (
  options: Readonly<{
    root?: string
    clientEntry?: string
    base?: string
    origin?: string
    allowedHosts?: true | ReadonlyArray<string>
    cors?: boolean | CorsOptions
    proxyTarget?: string
    seedVary?: string
    buildId?: string
    runnableSsr?: false
    hostVite?: true
    quietStandDown?: true
    warnings?: Array<string>
  }> = {},
) => {
  const createServer =
    options.hostVite === true ? createHostServer : createViteServer
  const server = await createServer({
    root: options.root ?? FIXTURE_ROOT,
    ...(options.base === undefined ? {} : { base: options.base }),
    configFile: false,
    logLevel: 'silent',
    ...(options.warnings === undefined
      ? {}
      : { customLogger: collectingLogger(options.warnings) }),
    plugins: [
      ...(options.runnableSsr === false ? [nonRunnableSsrPlugin] : []),
      ...(options.hostVite === true ? [foreignCopyAssertionPlugin] : []),
      ...(options.seedVary === undefined
        ? []
        : [seedVaryPlugin(options.seedVary)]),
      foldkitSsr({
        serverEntry: '/entry.server.ts',
        ...(options.clientEntry === undefined
          ? {}
          : { clientEntry: options.clientEntry }),
        ...(options.origin === undefined ? {} : { origin: options.origin }),
        ...(options.buildId === undefined ? {} : { buildId: options.buildId }),
        ...(options.quietStandDown === undefined
          ? {}
          : { quietStandDown: options.quietStandDown }),
      }),
    ],
    server: {
      host: '127.0.0.1',
      port: 0,
      ...(options.cors === undefined ? {} : { cors: options.cors }),
      ...allowedHostsConfiguration(options.allowedHosts),
      ...(options.proxyTarget === undefined
        ? {}
        : { proxy: { '/api': options.proxyTarget } }),
    },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()

  return originOf(server.httpServer?.address())
}

const startAutomaticIdentityServer = async (): Promise<
  Readonly<{ origin: string; server: ViteDevServer }>
> => {
  const server = await createViteServer({
    root: AUTOMATIC_IDENTITY_FIXTURE_ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      foldkit({
        devToolsMcpPort: false,
        ssr: {
          serverEntry: '/entry.server.ts',
          clientEntry: '/entry.client.ts',
        },
      }),
    ],
    server: {
      host: '127.0.0.1',
      port: 0,
    },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()

  return {
    origin: originOf(server.httpServer?.address()),
    server,
  }
}

describe('code-rendered documents in development', () => {
  it('serves nested pages with a source entry, custom document, and HMR without an HTML input', async () => {
    const origin = await startServer({
      root: resolve(import.meta.dirname, 'fixtures/build-assets'),
      clientEntry: '/entry.client.ts',
      base: '/app/',
      buildId: 'document-dev',
    })
    const response = await fetch(`${origin}/app/deep/page?filter=yes`)
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('>/app/deep/page</main>')
    expect(html).toContain('name="document-owner" content="server-entry"')
    expect(html).toContain('src="/app/entry.client.ts"')
    expect(html).toContain('/app/@vite/client')
    expect((await fetch(`${origin}/app/entry.client.ts`)).status).toBe(200)

    const head = await fetch(`${origin}/app/deep/page`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
  })

  it('reports a missing document renderer when a script entry is configured', async () => {
    const origin = await startServer({ clientEntry: '/entry.client.ts' })
    const response = await fetch(`${origin}/`)
    expect(response.status).toBe(500)
    expect(await response.text()).toContain('must export renderDocument')
  })

  it('rejects a client entry that is not root-relative', async () => {
    await expect(
      startServer({ clientEntry: 'entry.client.ts' }),
    ).rejects.toThrow(/clientEntry must be a root-relative browser script URL/)
  })

  for (const base of ['', './']) {
    it(`refuses relative base ${JSON.stringify(base)} in document mode`, async () => {
      await expect(
        startServer({ clientEntry: '/entry.client.ts', base }),
      ).rejects.toThrow(/require an absolute URL or root-relative base/)
    })
  }
})

const automaticIdentityFrom = async (
  running: Readonly<{ origin: string; server: ViteDevServer }>,
): Promise<string> => {
  const response = await fetch(`${running.origin}/`)
  expect(response.status).toBe(200)
  const html = await response.text()
  const buildId = /data-foldkit-build="([^"]+)"/.exec(html)?.[1]
  expect(buildId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )

  const transformedClientToken =
    await running.server.environments.client.transformRequest(
      FOLDKIT_BUILD_TOKEN_URL,
    )
  expect(transformedClientToken?.code).toContain(JSON.stringify(buildId))

  return buildId ?? ''
}

describe('foldkitSsr', () => {
  it(
    'compiles one fresh identity into Foldkit for each aggregate dev server',
    async () => {
      const first = await startAutomaticIdentityServer()
      const second = await startAutomaticIdentityServer()

      const firstBuildId = await automaticIdentityFrom(first)
      const secondBuildId = await automaticIdentityFrom(second)

      expect(secondBuildId).not.toBe(firstBuildId)
    },
    AGGREGATE_DEV_SERVER_TEST_TIMEOUT_MS,
  )

  it('injects Rendered results and preserves their HTTP metadata', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(response.headers.get('x-rendered')).toBe('yes')
    expect(response.headers.getSetCookie()).toEqual([
      'first=1; Path=/',
      'second=2; Path=/',
    ])
    expect(await response.text()).toContain(
      '<main data-foldkit-app="app" data-foldkit-build="development">/rendered</main>',
    )
  })

  it('compiles a configured build id when used as a standalone plugin', async () => {
    const origin = await startServer({ buildId: 'standalone-deployment' })
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect(await response.text()).toContain(
      'data-foldkit-build="standalone-deployment"',
    )
  })

  it('passes the request body to Responded handlers', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/echo`, {
      method: 'POST',
      body: 'payload',
    })

    expect(response.status).toBe(202)
    expect(response.headers.get('x-response')).toBe('echo')
    expect(await response.text()).toBe('POST:payload')
  })

  it('passes complete redirect responses through', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/redirect`, {
      headers: { accept: 'text/html' },
      redirect: 'manual',
    })

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${origin}/rendered`)
  })

  it('renders for clients that accept anything, matching a production host', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: '*/*' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toContain('data-foldkit-app="app"')
  })

  it('renders a template request regardless of Accept, matching a production host', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/index.html`, {
      headers: { accept: 'application/json' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toContain('data-foldkit-app="app"')
  })

  it('marks an Accept-negotiated deep route with Vary: Accept', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect((response.headers.get('vary') ?? '').toLowerCase()).toContain(
      'accept',
    )
  })

  it('does not add Accept to the Vary of a template request', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/index.html`, {
      headers: { accept: 'text/html' },
    })

    expect((response.headers.get('vary') ?? '').toLowerCase()).not.toContain(
      'accept',
    )
  })

  it('does not render for a client that refuses HTML with q=0', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html;q=0' },
    })

    expect(response.status).not.toBe(203)
    expect(await response.text()).not.toContain('data-foldkit-app')
  })

  it('varies the refused-HTML deep route 404 on Accept', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html;q=0' },
    })

    expect(response.status).toBe(404)
    expect((response.headers.get('vary') ?? '').toLowerCase()).toContain(
      'accept',
    )
  })

  it('resolves relative template assets against the template on nested routes', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/deep/nested`, {
      headers: { accept: 'text/html' },
    })

    const html = await response.text()
    expect(html).toContain('src="/entry.client.ts"')
    expect(html).not.toContain('src="./entry.client.ts"')
  })

  it('does not send a body for HEAD requests', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      method: 'HEAD',
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toBe('')
  })

  it('hands the entry the configured origin for an ordinary request', async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, '/request-info')

    expect(response.status).toBe(200)
    expect(response.body).toBe(`${origin}/request-info`)
  })

  it('ignores the Host header when deciding the origin the entry sees', async () => {
    // Vite accepts IP-literal Host values by default, and any name at all under
    // `allowedHosts`. None of them may name the origin an entry builds
    // redirects, canonical URLs, or cookie domains from.
    const origin = await startServer()
    for (const host of ['203.0.113.10', '127.0.0.2', '[::1]']) {
      const response = await requestWithTarget(origin, '/request-info', {
        headers: { host },
      })

      expect(response.status, host).toBe(200)
      expect(response.body, host).toBe(`${origin}/request-info`)
    }
  })

  it('ignores an allowed hostile Host header', async () => {
    const origin = await startServer({ allowedHosts: true })
    const response = await requestWithTarget(origin, '/request-info', {
      headers: { host: 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe(`${origin}/request-info`)
  })

  it('serves the origin the plugin was configured with', async () => {
    // The deployment-controlled origin, for a dev server behind a proxy or TLS
    // terminator that serves a different public origin.
    const origin = await startServer({
      origin: 'https://app.example',
      allowedHosts: true,
    })
    const response = await requestWithTarget(origin, '/request-info', {
      headers: { host: 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe('https://app.example/request-info')
  })

  // A host plugin that backs the `ssr` environment with its own runtime — a
  // Workers plugin running the entry in workerd — leaves the environment
  // without a module runner, and serves pages through that runtime itself.
  // Rendering here would need the runner, so the plugin stands down and lets
  // the host answer, rather than failing every page request. The check cannot
  // be Vite's own `isRunnableDevEnvironment`: that is an `instanceof` against
  // the class of whichever copy of Vite the plugin imported, which is not
  // always the copy that made the server.
  it(`stands down when Vite gives the ssr environment no runner`, async () => {
    const warnings: Array<string> = []
    const origin = await startServer({
      runnableSsr: false,
      warnings,
    })

    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    // Nothing rendered, and nothing failed either: the request reached the
    // end of the middleware chain, which in this test has no host waiting
    // behind Foldkit.
    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('data-foldkit-app')
    expect(warnings.join('\n')).toContain(
      'the "ssr" environment is not runnable',
    )
    expect(warnings.join('\n')).not.toContain('Remove `ssr.serverEntry`')
  })

  // The runnable check must hold when the server comes from a different copy
  // of Vite than the plugin imported, which is what a host with its own Vite
  // dependency looks like. Vite's `isRunnableDevEnvironment` fails that case.
  it('renders through a runnable environment from another copy of Vite', async () => {
    const warnings: Array<string> = []
    const origin = await startServer({ hostVite: true, warnings })

    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(203)
    expect(response.headers.get('x-rendered')).toBe('yes')
    expect(await response.text()).toContain('data-foldkit-app="app"')
    expect(warnings.join('\n')).not.toContain('is not runnable')
  })

  it('stays quiet when standing down under ssr.build', async () => {
    const warnings: Array<string> = []
    const origin = await startServer({
      runnableSsr: false,
      quietStandDown: true,
      warnings,
    })

    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    expect(response.status).toBe(404)
    expect(warnings).toEqual([])
  })

  it(`preserves the browser URL across the Vite base middleware`, async () => {
    const origin = await startServer({
      base: '/app/',
      origin: 'https://app.example',
    })
    const response = await requestWithTarget(
      origin,
      '/app/request-info?tab=details',
    )

    expect(response.status).toBe(200)
    expect(response.body).toBe(
      'https://app.example/app/request-info?tab=details',
    )
  })

  it('refuses a target that names another origin than the configured one', async () => {
    const origin = await startServer({
      origin: 'https://app.example',
      allowedHosts: true,
    })
    const response = await requestWithTarget(
      origin,
      'https://evil.example/request-info',
      { headers: { host: 'app.example' } },
    )

    expect(response.status).toBe(400)
  })

  it('refuses a network-path request target rather than adopting its origin', async () => {
    // `//evil.example/request-info` resolves against the host origin to
    // `http://evil.example/request-info`. An entry that builds redirects,
    // canonical URLs, or tenant selection from `Request.url` would take them
    // from the request, so the target is refused before the entry runs.
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      '//evil.example/request-info',
    )

    expect(response.status).toBe(400)
    expect(response.body).not.toContain('evil.example')
  })

  it('refuses an absolute-form request target that names another origin', async () => {
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      'http://evil.example/request-info',
    )

    expect(response.status).toBe(400)
    expect(response.body).not.toContain('evil.example')
  })

  it('never renders a request carrying a hostile Host header', async () => {
    // Vite refuses an unrecognized Host with 403 before this middleware sees
    // it, and the origin guard would refuse the target after. Either way the
    // entry never runs with an origin the client chose.
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      '//evil.example/request-info',
      { headers: { host: 'evil.example' } },
    )

    expect([400, 403]).toContain(response.status)
    expect(response.body).not.toContain('evil.example/request-info')
  })

  it('serves an absolute-form target that names the host origin', async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, `${origin}/request-info`, {
      headers: { host: new URL(origin).host },
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe(`${origin}/request-info`)
  })

  it(`validates and normalizes targets before Vite source ownership`, async () => {
    const origin = await startServer()
    const source = await requestWithTarget(origin, `${origin}/entry.server.ts`)
    expect(source.status).toBe(200)

    for (const target of [
      '//evil.example/../entry.server.ts',
      '//evil.example/%2e%2e/entry.server.ts',
    ]) {
      const response = await requestWithTarget(origin, target)
      expect(response.status, target).toBe(400)
      expect(response.body, target).not.toContain('renderPage')
    }

    const refusedMethod = await requestWithTarget(
      origin,
      '//evil.example/../deep/route',
      { method: 'TRACE' },
    )
    expect(refusedMethod.status).toBe(400)
    expect(refusedMethod.headers['allow']).toBeUndefined()
  })

  it('returns 404 rather than HTML for a missing asset', async () => {
    // A browser fetches scripts with `Accept: */*`, which accepts HTML. Without
    // an asset classification, a hashed asset from a previous deployment would
    // be answered with the app shell at 200 and read as a blank page.
    const origin = await startServer()
    const response = await fetch(`${origin}/assets/stale-hash.js`, {
      headers: { accept: '*/*' },
    })

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('data-foldkit-app')
  })

  it('returns 404 for missing stylesheets, source maps, and images', async () => {
    const origin = await startServer()
    for (const path of [
      '/assets/stale-hash.css',
      '/assets/stale-hash.js.map',
      '/assets/missing.png',
    ]) {
      const response = await fetch(`${origin}${path}`, {
        headers: { accept: '*/*' },
      })
      expect(response.status).toBe(404)
    }
  })

  it('returns 404 for a missing asset requested as a subresource', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('data-foldkit-app')
  })

  it('returns 404 for a missing asset requested with HEAD', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/assets/stale-hash.js`, {
      method: 'HEAD',
      headers: { accept: '*/*' },
    })

    expect(response.status).toBe(404)
  })

  it('declares both negotiated headers on every outcome, in either request order', async () => {
    // A shared cache keys on the headers a response declares. Both requests
    // carry the same Accept and differ only in Sec-Fetch-Dest, so an outcome
    // that declared only Accept could be served to the other kind of request:
    // the 404 for a real page, or the page for a script request.
    const origin = await startServer()

    const scriptFirst = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })
    expect(scriptFirst.status).toBe(404)
    const scriptVary = (scriptFirst.headers.get('vary') ?? '').toLowerCase()
    expect(scriptVary).toContain('sec-fetch-dest')
    expect(scriptVary).toContain('accept')

    const documentSecond = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'document' },
    })
    expect(documentSecond.status).toBe(203)
    const documentVary = (
      documentSecond.headers.get('vary') ?? ''
    ).toLowerCase()
    expect(documentVary).toContain('sec-fetch-dest')
    expect(documentVary).toContain('accept')
    expect(await documentSecond.text()).toContain('data-foldkit-app')
  })

  it('declares both negotiated headers when the document is requested first', async () => {
    const origin = await startServer()

    const documentFirst = await fetch(`${origin}/deep/other-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'document' },
    })
    expect(documentFirst.status).toBe(203)
    expect((documentFirst.headers.get('vary') ?? '').toLowerCase()).toContain(
      'sec-fetch-dest',
    )

    const scriptSecond = await fetch(`${origin}/deep/other-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })
    expect(scriptSecond.status).toBe(404)
    expect((scriptSecond.headers.get('vary') ?? '').toLowerCase()).toContain(
      'sec-fetch-dest',
    )
  })

  it('preserves existing Vary fields on a negotiated refusal', async () => {
    const origin = await startServer({ seedVary: 'Origin' })
    const response = await fetch(`${origin}/deep/stale-chunk`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    const vary = (response.headers.get('vary') ?? '').toLowerCase()
    expect(vary).toContain('sec-fetch-dest')
    expect(vary).toContain('origin')
  })

  it('merges an application Vary with one already on the response', async () => {
    // Copying the application's `Vary: cookie` over a field already there with
    // setHeader replaces it, which would let a shared cache serve one origin's
    // response to another. The entry's own field has to survive too.
    const origin = await startServer({ seedVary: 'Origin' })
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: 'text/html' },
    })

    const vary = (response.headers.get('vary') ?? '').toLowerCase()
    expect(vary).toContain('origin')
    expect(vary).toContain('cookie')
    expect(vary).toContain('accept')
  })

  it('hands a preflight to the server entry rather than answering it', async () => {
    // The entry owns application CORS. Vite's policy still applies to source
    // modules and HMR, but it cannot answer this application preflight first.
    const origin = await startServer()
    const response = await fetch(`${origin}/deep/route`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('x-preflight')).toBe('/deep/route')
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
    expect(response.headers.get('access-control-allow-methods')).toBeNull()
  })

  it(`hands ordinary asset-looking OPTIONS to the entry under Vite`, async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, '/entry.client.ts', {
      method: 'OPTIONS',
    })

    expect(response.status).toBe(204)
    expect(response.headers['x-preflight']).toBe('/entry.client.ts')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it(`does not treat a requested method without Origin as a Vite preflight`, async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, '/entry.client.ts', {
      method: 'OPTIONS',
      headers: { 'access-control-request-method': 'GET' },
    })

    expect(response.status).toBe(204)
    expect(response.headers['x-preflight']).toBe('/entry.client.ts')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it(`hands a POST preflight for an asset-looking path to the entry under Vite`, async () => {
    const origin = await startServer()
    const response = await requestWithTarget(origin, '/entry.client.ts', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://browser.example',
        'access-control-request-method': 'POST',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers['x-preflight']).toBe('/entry.client.ts')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it(`validates an asset-looking preflight target before Vite CORS`, async () => {
    const origin = await startServer()
    const response = await requestWithTarget(
      origin,
      'http://evil.example/entry.client.ts',
      {
        method: 'OPTIONS',
        headers: {
          origin: 'https://browser.example',
          'access-control-request-method': 'GET',
        },
      },
    )

    expect(response.status).toBe(400)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(response.headers['x-preflight']).toBeUndefined()
  })

  it(`removes Vite CORS from application GET and POST responses`, async () => {
    const origin = await startServer({ cors: true })
    const getResponse = await requestWithTarget(origin, '/rendered', {
      headers: {
        accept: 'text/html',
        origin: 'https://browser.example',
      },
    })
    const postResponse = await requestWithTarget(origin, '/echo', {
      method: 'POST',
      body: 'payload',
      headers: { origin: 'https://browser.example' },
    })

    expect(getResponse.status).toBe(203)
    expect(getResponse.headers['access-control-allow-origin']).toBeUndefined()
    expect(getResponse.headers['vary']?.toLowerCase()).not.toContain('origin')
    expect(postResponse.status).toBe(202)
    expect(postResponse.headers['access-control-allow-origin']).toBeUndefined()
    expect((postResponse.headers['vary'] ?? '').toLowerCase()).not.toContain(
      'origin',
    )
  })

  it('preserves CORS headers authored by the server entry', async () => {
    const origin = await startServer({
      cors: {
        origin: 'https://vite.example',
        credentials: false,
      },
    })
    const response = await requestWithTarget(origin, '/entry-cors', {
      headers: {
        accept: 'text/html',
        origin: 'https://browser.example',
      },
    })

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://entry.example',
    )
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers['x-cors-owner']).toBe('entry')
    expect(response.headers['vary']?.toLowerCase()).toContain('origin')
  })

  for (const testCase of [
    {
      name: 'enabled',
      cors: true,
      expectedOrigin: '*',
      expectedCredentials: undefined,
    },
    {
      name: 'disabled',
      cors: false,
      expectedOrigin: undefined,
      expectedCredentials: undefined,
    },
    {
      name: 'configured',
      cors: {
        origin: 'https://vite.example',
        credentials: true,
        exposedHeaders: ['x-vite-source'],
      },
      expectedOrigin: 'https://vite.example',
      expectedCredentials: 'true',
    },
  ] satisfies ReadonlyArray<
    Readonly<{
      name: string
      cors: boolean | CorsOptions
      expectedOrigin: string | undefined
      expectedCredentials: string | undefined
    }>
  >) {
    it(`keeps Vite CORS ${testCase.name} for Vite-owned source`, async () => {
      const origin = await startServer({
        cors: testCase.cors,
      })
      const response = await requestWithTarget(origin, '/entry.client.ts', {
        headers: { origin: 'https://browser.example' },
      })

      expect(response.status).toBe(200)
      expect(response.body).toContain('export')
      expect(response.headers['access-control-allow-origin']).toBe(
        testCase.expectedOrigin,
      )
      expect(response.headers['access-control-allow-credentials']).toBe(
        testCase.expectedCredentials,
      )
    })
  }

  it(`keeps a Vite source-module preflight under Vite CORS ownership`, async () => {
    const origin = await startServer({ cors: true })
    const response = await requestWithTarget(origin, '/entry.client.ts', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://browser.example',
        'access-control-request-method': 'GET',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('*')
    expect(response.headers['x-preflight']).toBeUndefined()
  })

  it(`keeps a base-prefixed Vite client preflight under Vite CORS ownership`, async () => {
    const origin = await startServer({ base: '/app/', cors: true })
    const response = await requestWithTarget(origin, '/app/@vite/client', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://browser.example',
        'access-control-request-method': 'GET',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('*')
    expect(response.headers['x-preflight']).toBeUndefined()
  })

  it('leaves the Vite client and HMR ping under Vite ownership', async () => {
    const origin = await startServer({ cors: true })
    const clientResponse = await requestWithTarget(origin, '/@vite/client', {
      headers: { origin: 'https://browser.example' },
    })
    const pingResponse = await requestWithTarget(origin, '/', {
      headers: {
        accept: 'text/x-vite-ping',
        origin: 'https://browser.example',
      },
    })

    expect(clientResponse.status).toBe(200)
    expect(clientResponse.headers['access-control-allow-origin']).toBe('*')
    expect(pingResponse.status).toBe(204)
    expect(pingResponse.headers['access-control-allow-origin']).toBe('*')
  })

  it(`validates Host in Vite before application OPTIONS and refused methods`, async () => {
    const origin = await startServer()
    const preflight = await requestWithTarget(origin, '/deep/route', {
      method: 'OPTIONS',
      headers: {
        host: 'evil.example',
        origin: 'https://browser.example',
        'access-control-request-method': 'POST',
      },
    })
    const trace = await requestWithTarget(origin, '/', {
      method: 'TRACE',
      headers: { host: 'evil.example' },
    })

    expect(preflight.status).toBe(403)
    expect(preflight.headers['x-preflight']).toBeUndefined()
    expect(trace.status).toBe(403)
    expect(trace.headers['allow']).toBeUndefined()
  })

  it('lets an explicitly allowed Host reach application OPTIONS', async () => {
    const origin = await startServer({ allowedHosts: ['evil.example'] })
    const response = await requestWithTarget(origin, '/deep/route', {
      method: 'OPTIONS',
      headers: {
        host: 'evil.example',
        origin: 'https://browser.example',
        'access-control-request-method': 'POST',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers['x-preflight']).toBe('/deep/route')
  })

  it(`leaves GET and OPTIONS for a Vite proxy under proxy ownership`, async () => {
    const proxyTarget = await startProxyTarget()
    const origin = await startServer({
      cors: true,
      proxyTarget,
    })
    const getResponse = await requestWithTarget(origin, '/api/items', {
      headers: { origin: 'https://browser.example' },
    })
    const optionsResponse = await requestWithTarget(origin, '/api/items', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://browser.example',
        'access-control-request-method': 'POST',
      },
    })

    expect(getResponse.status).toBe(218)
    expect(getResponse.headers['x-request-owner']).toBe('proxy')
    expect(getResponse.body).toBe('GET:/api/items:')
    expect(optionsResponse.status).toBe(218)
    expect(optionsResponse.headers['x-request-owner']).toBe('proxy')
    expect(optionsResponse.headers['x-preflight']).toBeUndefined()
    expect(optionsResponse.body).toBe('OPTIONS:/api/items:')
  })

  it('does not vary a refusal the path alone settles', async () => {
    // `/assets/stale-hash.js` is an asset for every client, so the refusal is
    // the same for all of them and needs no variance.
    const origin = await startServer()
    const response = await fetch(`${origin}/assets/stale-hash.js`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    })

    expect(response.status).toBe(404)
    expect((response.headers.get('vary') ?? '').toLowerCase()).not.toContain(
      'sec-fetch-dest',
    )
  })

  it('still renders a deep route that accepts anything', async () => {
    const origin = await startServer()
    const response = await fetch(`${origin}/rendered`, {
      headers: { accept: '*/*', 'sec-fetch-dest': 'document' },
    })

    expect(response.status).toBe(203)
    expect(await response.text()).toContain('data-foldkit-app')
  })
})

const copyHotDisposeFixtureToTemporaryRoot = (): string => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'foldkit-ssr-hot-')))
  onTestFinished(() => rmSync(root, { recursive: true, force: true }))
  cpSync(HOT_DISPOSE_FIXTURE_ROOT, root, { recursive: true })
  mkdirSync(join(root, 'node_modules'))
  symlinkSync(FOLDKIT_PACKAGE_ROOT, join(root, 'node_modules', 'foldkit'))
  symlinkSync(EFFECT_PACKAGE_ROOT, join(root, 'node_modules', 'effect'))

  return root
}

const SHORT_SERVER_UPDATE_DELAY_MS = 100
const LONG_SERVER_UPDATE_DELAY_MS = 300

const delayFor = (milliseconds: number): Promise<void> =>
  new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))

const delaySsrHotUpdates = (
  delaysByFileName: ReadonlyMap<string, number>,
): Plugin => ({
  name: 'test:delay-ssr-hot-updates',
  async hotUpdate({ file }) {
    const delay = delaysByFileName.get(basename(file))

    if (this.environment.name === 'ssr' && delay !== undefined) {
      await delayFor(delay)
    }
  },
})

const HOT_DISPOSE_PLUGIN_SETUPS = [
  {
    name: 'the standalone foldkitSsr plugin',
    plugins: () => [foldkitSsr({ serverEntry: '/entry.server.ts' })],
  },
  {
    name: 'the aggregate foldkit plugin',
    plugins: () =>
      foldkit({
        devToolsMcpPort: false,
        ssr: { serverEntry: '/entry.server.ts' },
      }),
  },
]

const startHotDisposeServer = async (
  root: string,
  plugins: ReadonlyArray<Plugin>,
  serverOptions: Readonly<{ hmr?: false }> = {},
): Promise<Readonly<{ origin: string; server: ViteDevServer }>> => {
  const server = await createViteServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [...plugins],
    // NOTE: File system events are unreliable here. macOS can deliver events
    // for the fixture files copied just before the server starts, and a write
    // can land before the watcher finishes its first scan. With the watcher
    // off, the test reports each edit to Vite itself.
    server: {
      host: '127.0.0.1',
      port: 0,
      watch: null,
      ...serverOptions,
    },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()

  return { origin: originOf(server.httpServer?.address()), server }
}

const editFile = (
  root: string,
  server: ViteDevServer,
  fileName: string,
  source: string,
): void => {
  const file = join(root, fileName)
  writeFileSync(file, source)
  server.watcher.emit('change', file)
}

const editGeneration = (
  root: string,
  server: ViteDevServer,
  generation: number,
): Promise<void> =>
  new Promise((resolveEvaluation, reject) => {
    const timeout = setTimeout(() => {
      server.environments.ssr.hot.off(ENTRY_EVALUATED_EVENT, listener)
      reject(
        new Error(
          `The server entry was not hot updated to generation ${generation}`,
        ),
      )
    }, HOT_UPDATE_TIMEOUT_MS)
    const listener = (data: unknown): void => {
      if (
        Predicate.hasProperty(data, 'generation') &&
        data.generation === generation
      ) {
        clearTimeout(timeout)
        server.environments.ssr.hot.off(ENTRY_EVALUATED_EVENT, listener)
        resolveEvaluation()
      }
    }
    server.environments.ssr.hot.on(ENTRY_EVALUATED_EVENT, listener)

    editFile(
      root,
      server,
      'generation.ts',
      `export const generation = ${generation}\n`,
    )
  })

describe('server entry hot updates', () => {
  for (const setup of HOT_DISPOSE_PLUGIN_SETUPS) {
    it(`finalizes the server entry resource and reevaluates server modules under ${setup.name}`, async () => {
      const root = copyHotDisposeFixtureToTemporaryRoot()
      const { origin, server } = await startHotDisposeServer(
        root,
        setup.plugins(),
      )
      const rendered = async (): Promise<unknown> =>
        (await fetch(`${origin}/`)).json()

      expect(await rendered()).toEqual({
        generation: 1,
        releasedGenerations: [],
        configurationEvaluations: 1,
      })

      await editGeneration(root, server, 2)
      expect(await rendered()).toEqual({
        generation: 2,
        releasedGenerations: [1],
        configurationEvaluations: 2,
      })

      await editGeneration(root, server, 3)
      expect(await rendered()).toEqual({
        generation: 3,
        releasedGenerations: [1, 2],
        configurationEvaluations: 3,
      })
    })
  }

  it('reloads the browser when a module only the server imports changes', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(
      root,
      foldkit({
        devToolsMcpPort: false,
        ssr: { serverEntry: '/entry.server.ts' },
      }),
    )
    await fetch(`${origin}/`)
    const send = vi.spyOn(server.ws, 'send')
    onTestFinished(() => send.mockRestore())

    await editGeneration(root, server, 2)

    expect(send).toHaveBeenCalledWith({ type: 'full-reload' })
  })

  it('holds a request made during a server update until the module runner applies it', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(root, [
      foldkitSsr({ serverEntry: '/entry.server.ts' }),
      delaySsrHotUpdates(
        new Map([['generation.ts', SHORT_SERVER_UPDATE_DELAY_MS]]),
      ),
    ])
    const rendered = async (): Promise<unknown> =>
      (await fetch(`${origin}/`)).json()
    await rendered()

    const evaluation = editGeneration(root, server, 2)
    const renderedDuringUpdate = await rendered()
    await evaluation

    expect(renderedDuringUpdate).toEqual({
      generation: 2,
      releasedGenerations: [1],
      configurationEvaluations: 2,
    })
    expect(await rendered()).toEqual(renderedDuringUpdate)
  })

  it('holds a request until every overlapping server update settles', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(root, [
      foldkitSsr({ serverEntry: '/entry.server.ts' }),
      delaySsrHotUpdates(
        new Map([['configuration.ts', LONG_SERVER_UPDATE_DELAY_MS]]),
      ),
    ])
    const rendered = async (): Promise<unknown> =>
      (await fetch(`${origin}/`)).json()
    await rendered()

    editFile(
      root,
      server,
      'configuration.ts',
      readFileSync(join(root, 'configuration.ts'), 'utf-8'),
    )
    await editGeneration(root, server, 2)

    expect(await rendered()).toMatchObject({
      generation: 2,
      releasedGenerations: [1],
    })
  })

  it('settles each update when two server files change together', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(root, [
      foldkitSsr({ serverEntry: '/entry.server.ts' }),
      delaySsrHotUpdates(
        new Map([
          ['configuration.ts', SHORT_SERVER_UPDATE_DELAY_MS],
          ['generation.ts', LONG_SERVER_UPDATE_DELAY_MS],
        ]),
      ),
    ])
    const rendered = async (): Promise<unknown> =>
      (await fetch(`${origin}/`)).json()
    await rendered()

    const reportedUpdates: Array<unknown> = []
    server.environments.ssr.hot.on(SERVER_UPDATE_SETTLED_EVENT, payload => {
      reportedUpdates.push(payload)
    })

    editFile(
      root,
      server,
      'configuration.ts',
      readFileSync(join(root, 'configuration.ts'), 'utf-8'),
    )
    editFile(root, server, 'generation.ts', 'export const generation = 2\n')

    expect(await rendered()).toMatchObject({
      generation: 2,
      releasedGenerations: [1],
    })
    expect(reportedUpdates).toHaveLength(2)
  })

  it('unregisters the server update listener when the environment closes', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(root, [
      foldkitSsr({ serverEntry: '/entry.server.ts' }),
    ])
    await fetch(`${origin}/`)

    const off = vi.spyOn(server.environments.ssr.hot, 'off')
    await server.close()

    expect(off).toHaveBeenCalledWith(
      SERVER_UPDATE_SETTLED_EVENT,
      expect.any(Function),
    )
  })

  it('disposes the server entry when a module it has not loaded yet changes', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(root, [
      foldkitSsr({ serverEntry: '/entry.server.ts' }),
      delaySsrHotUpdates(new Map([['lazy.ts', SHORT_SERVER_UPDATE_DELAY_MS]])),
    ])
    await fetch(`${origin}/`)

    editFile(root, server, 'lazy.ts', 'export const lazyValue = 2\n')

    expect(await (await fetch(`${origin}/`)).json()).toMatchObject({
      generation: 1,
      releasedGenerations: [1],
    })
  })

  it('releases held requests when a server update never reaches the module runner', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(root, [
      foldkitSsr({ serverEntry: '/entry.server.ts' }),
      {
        name: 'test:suppress-ssr-hot-updates',
        hotUpdate() {
          return this.environment.name === 'ssr' ? [] : undefined
        },
      },
    ])
    await fetch(`${origin}/`)

    editFile(root, server, 'generation.ts', 'export const generation = 2\n')
    const requestStart = performance.now()
    const response = await fetch(`${origin}/`)

    expect(response.status).toBe(200)
    expect(performance.now() - requestStart).toBeLessThan(HOT_UPDATE_TIMEOUT_MS)
  })

  it('reloads the server entry on the next request without disposing it when HMR is off', async () => {
    const root = copyHotDisposeFixtureToTemporaryRoot()
    const { origin, server } = await startHotDisposeServer(
      root,
      [foldkitSsr({ serverEntry: '/entry.server.ts' })],
      { hmr: false },
    )
    const rendered = async (): Promise<unknown> =>
      (await fetch(`${origin}/`)).json()
    await rendered()

    editFile(root, server, 'generation.ts', 'export const generation = 2\n')

    expect(await rendered()).toMatchObject({
      generation: 2,
      releasedGenerations: [],
    })
  })
})
