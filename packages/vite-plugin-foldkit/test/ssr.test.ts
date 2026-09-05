import {
  type Server as HttpServer,
  createServer as createHttpServer,
  request as nodeRequest,
} from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import {
  type CorsOptions,
  DevEnvironment,
  type Logger,
  type Plugin,
  type ResolvedConfig,
  createServer as createViteServer,
} from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'

import { foldkitSsr } from '../src/ssr.ts'

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

// Vite's `DevEnvironment` constructor, as the two installed majors both shape
// it. Their classes are nominally incompatible for the same reason their
// `Plugin` types are, so a test that instantiates either one describes the
// shared shape itself.
type DevEnvironmentConstructor = new (
  name: string,
  config: ResolvedConfig,
  context: { hot: boolean },
) => DevEnvironment

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
const VITE_MAJORS: ReadonlyArray<7 | 8> = [7, 8]

const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createNetServer()
    probe.on('error', error => {
      probe.close()
      reject(error)
    })
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (address === null || typeof address === 'string') {
        probe.close()
        reject(new Error('Could not determine a free port'))
        return
      }
      probe.close(() => resolvePort(address.port))
    })
  })

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
  const port = await findFreePort()
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
    server.listen(port, '127.0.0.1', resolveListen)
  })
  return `http://127.0.0.1:${port}`
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

// Stands in for a host plugin that backs the `ssr` environment with its own
// runtime, such as a Workers plugin running the entry in workerd: the
// environment is a plain `DevEnvironment`, so it has no module runner. The
// class comes from the same copy of Vite that creates the server, because Vite
// only accepts its own.
const nonRunnableSsrPlugin = (
  DevEnvironmentClass: DevEnvironmentConstructor,
): Plugin => ({
  name: 'test:non-runnable-ssr',
  config: () => ({
    environments: {
      ssr: {
        dev: {
          createEnvironment: (name: string, config: ResolvedConfig) =>
            new DevEnvironmentClass(name, config, { hot: false }),
        },
      },
    },
  }),
})

const startServer = async (
  options: Readonly<{
    base?: string
    origin?: string
    allowedHosts?: true | ReadonlyArray<string>
    cors?: boolean | CorsOptions
    proxyTarget?: string
    seedVary?: string
    viteMajor?: 7 | 8
    buildId?: string
    runnableSsr?: false
    quietStandDown?: true
    warnings?: Array<string>
  }> = {},
) => {
  const port = await findFreePort()
  let createServer = createViteServer
  let DevEnvironmentClass: DevEnvironmentConstructor =
    DevEnvironment as unknown as DevEnvironmentConstructor
  if (options.viteMajor === 7) {
    // NOTE: Vite's Plugin type exposes its bundler internals, which changed
    // from Rollup in Vite 7 to Rolldown in Vite 8. The dev-server contract this
    // test exercises is shared, but the otherwise-compatible Plugin types are
    // nominally incompatible across the two installed majors.
    const vite7 = await import('vite7')
    createServer = vite7.createServer as unknown as typeof createViteServer
    DevEnvironmentClass =
      vite7.DevEnvironment as unknown as DevEnvironmentConstructor
  }
  const server = await createServer({
    root: FIXTURE_ROOT,
    ...(options.base === undefined ? {} : { base: options.base }),
    configFile: false,
    logLevel: 'silent',
    ...(options.warnings === undefined
      ? {}
      : { customLogger: collectingLogger(options.warnings) }),
    plugins: [
      ...(options.runnableSsr === false
        ? [nonRunnableSsrPlugin(DevEnvironmentClass)]
        : []),
      ...(options.seedVary === undefined
        ? []
        : [seedVaryPlugin(options.seedVary)]),
      foldkitSsr({
        serverEntry: '/entry.server.ts',
        ...(options.origin === undefined ? {} : { origin: options.origin }),
        ...(options.buildId === undefined ? {} : { buildId: options.buildId }),
        ...(options.quietStandDown === undefined
          ? {}
          : { quietStandDown: options.quietStandDown }),
      }),
    ],
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
      ...(options.cors === undefined ? {} : { cors: options.cors }),
      ...allowedHostsConfiguration(options.allowedHosts),
      ...(options.proxyTarget === undefined
        ? {}
        : { proxy: { '/api': options.proxyTarget } }),
    },
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return `http://127.0.0.1:${port}`
}

describe('foldkitSsr', () => {
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
  // the host answer, rather than failing every page request. Both majors are
  // covered because the check cannot be Vite's own `isRunnableDevEnvironment`:
  // that is an `instanceof` against the class of whichever copy of Vite the
  // plugin imported, which is not always the copy that made the server.
  for (const viteMajor of VITE_MAJORS) {
    it(`stands down when Vite ${String(viteMajor)} gives the ssr environment no runner`, async () => {
      const warnings: Array<string> = []
      const origin = await startServer({
        viteMajor,
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
  }

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

  for (const viteMajor of VITE_MAJORS) {
    it(`preserves the browser URL across the Vite ${String(viteMajor)} base middleware`, async () => {
      const origin = await startServer({
        base: '/app/',
        origin: 'https://app.example',
        viteMajor,
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
  }

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

  for (const viteMajor of VITE_MAJORS) {
    it(`validates and normalizes targets before Vite ${String(viteMajor)} source ownership`, async () => {
      const origin = await startServer({ viteMajor })
      const source = await requestWithTarget(
        origin,
        `${origin}/entry.server.ts`,
      )
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
  }

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

  for (const viteMajor of VITE_MAJORS) {
    it(`hands ordinary asset-looking OPTIONS to the entry under Vite ${String(viteMajor)}`, async () => {
      const origin = await startServer({ viteMajor })
      const response = await requestWithTarget(origin, '/entry.client.ts', {
        method: 'OPTIONS',
      })

      expect(response.status).toBe(204)
      expect(response.headers['x-preflight']).toBe('/entry.client.ts')
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })

    it(`does not treat a requested method without Origin as a Vite ${String(viteMajor)} preflight`, async () => {
      const origin = await startServer({ viteMajor })
      const response = await requestWithTarget(origin, '/entry.client.ts', {
        method: 'OPTIONS',
        headers: { 'access-control-request-method': 'GET' },
      })

      expect(response.status).toBe(204)
      expect(response.headers['x-preflight']).toBe('/entry.client.ts')
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })

    it(`hands a POST preflight for an asset-looking path to the entry under Vite ${String(viteMajor)}`, async () => {
      const origin = await startServer({ viteMajor })
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

    it(`validates an asset-looking preflight target before Vite ${String(viteMajor)} CORS`, async () => {
      const origin = await startServer({ viteMajor })
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
  }

  for (const viteMajor of VITE_MAJORS) {
    it(`removes Vite ${String(viteMajor)} CORS from application GET and POST responses`, async () => {
      const origin = await startServer({ cors: true, viteMajor })
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
      expect(
        postResponse.headers['access-control-allow-origin'],
      ).toBeUndefined()
      expect((postResponse.headers['vary'] ?? '').toLowerCase()).not.toContain(
        'origin',
      )
    })
  }

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
    for (const viteMajor of VITE_MAJORS) {
      it(`keeps Vite ${String(viteMajor)} CORS ${testCase.name} for Vite-owned source`, async () => {
        const origin = await startServer({
          cors: testCase.cors,
          viteMajor,
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
  }

  for (const viteMajor of VITE_MAJORS) {
    it(`keeps a Vite ${String(viteMajor)} source-module preflight under Vite CORS ownership`, async () => {
      const origin = await startServer({ cors: true, viteMajor })
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

    it(`keeps a base-prefixed Vite ${String(viteMajor)} client preflight under Vite CORS ownership`, async () => {
      const origin = await startServer({ base: '/app/', cors: true, viteMajor })
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
  }

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

  for (const viteMajor of VITE_MAJORS) {
    it(`validates Host in Vite ${String(viteMajor)} before application OPTIONS and refused methods`, async () => {
      const origin = await startServer({ viteMajor })
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
  }

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

  for (const viteMajor of VITE_MAJORS) {
    it(`leaves GET and OPTIONS for a Vite ${String(viteMajor)} proxy under proxy ownership`, async () => {
      const proxyTarget = await startProxyTarget()
      const origin = await startServer({
        cors: true,
        proxyTarget,
        viteMajor,
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
  }

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
