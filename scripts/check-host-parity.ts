import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { request } from 'node:http'
import { resolve } from 'node:path'

// The Vite dev host and the production example host answer the same requests.
// They are different code (one is Vite middleware, the other an Effect
// HttpServer) reading one test-only server entry, and they disagreed about HTTP
// methods: Vite forwarded a POST and its body to `renderPage` while the
// production host answered 405 before the entry ran. A form action or a
// `Server.Responded` reply therefore worked all through development and failed
// only once deployed.
//
// This gate composes the real hosts with that entry and requires their answers
// to match. It separately proves the public example build contains and exposes
// none of the routes that exist only to make parity observable.

const EXAMPLE_DIR = resolve(process.cwd(), 'examples/ssr')
const HOST_PARITY_CONFIG = resolve(
  process.cwd(),
  'scripts/fixtures/host-parity/vite.config.ts',
)
const SERVER_BUNDLE = resolve(EXAMPLE_DIR, 'dist/server/fetch.js')
const HOST_PARITY_BUILD_ID = 'host-parity'
const EXPECTED_ALLOW = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
const BUILT_PORT = 5332
const NORMAL_BUILT_PORT = 5335
const HOST_PARITY_MARKERS: ReadonlyArray<string> = [
  '/echo',
  '/entry-cors',
  'x-echo',
  'x-cors-owner',
  'x-host-parity-options',
  'https://entry.example',
  'entry cors',
]

type DevHostVariant = Readonly<{
  label: string
  port: number
  cliArguments: ReadonlyArray<string>
  expectedSourceCorsOrigin: string | undefined
}>

const DEV_HOST_VARIANTS: ReadonlyArray<DevHostVariant> = [
  {
    label: 'default CORS',
    port: 5331,
    cliArguments: [],
    expectedSourceCorsOrigin: 'http://localhost:3000',
  },
  {
    label: 'CLI CORS enabled',
    port: 5333,
    cliArguments: ['--cors'],
    expectedSourceCorsOrigin: '*',
  },
  {
    label: 'CLI CORS disabled',
    port: 5334,
    cliArguments: ['--no-cors'],
    expectedSourceCorsOrigin: undefined,
  },
]

const isSkipBuild = process.argv.includes('--skip-build')

class ParityError extends Error {}

const log = (message: string): void => {
  console.log(`[host-parity] ${message}`)
}

const fail = (message: string): never => {
  throw new ParityError(message)
}

type Probe = Readonly<{
  name: string
  path: string
  method: string
  body?: string
  headers?: Readonly<Record<string, string>>
  // Response header names whose values must match between the two hosts.
  comparedHeaders: ReadonlyArray<string>
  expected?: Readonly<{
    status: number
    body?: string
    headers?: Readonly<Record<string, string>>
  }>
}>

const PROBES: ReadonlyArray<Probe> = [
  {
    name: 'GET a rendered page with Origin',
    path: '/',
    method: 'GET',
    headers: {
      accept: 'text/html',
      origin: 'https://browser.example',
    },
    comparedHeaders: [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'content-type',
      'cache-control',
      'vary',
      'x-content-type-options',
    ],
  },
  {
    name: 'HEAD a rendered page',
    path: '/',
    method: 'HEAD',
    headers: { accept: 'text/html' },
    comparedHeaders: ['content-type', 'cache-control'],
  },
  {
    name: 'POST with Origin reaching the entry with its body',
    path: '/echo',
    method: 'POST',
    body: 'payload',
    headers: { origin: 'https://browser.example' },
    comparedHeaders: [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'vary',
      'x-echo',
    ],
    expected: {
      status: 202,
      body: 'POST:payload',
      headers: { 'x-echo': 'entry' },
    },
  },
  {
    name: 'GET preserving entry-authored CORS',
    path: '/entry-cors',
    method: 'GET',
    headers: {
      accept: 'text/html',
      origin: 'https://browser.example',
    },
    comparedHeaders: [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'vary',
      'x-cors-owner',
    ],
    expected: {
      status: 200,
      body: 'entry cors',
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'https://entry.example',
        vary: 'Origin, Accept, Sec-Fetch-Dest',
        'x-cors-owner': 'entry',
      },
    },
  },
  {
    name: 'PUT reaching the entry',
    path: '/echo',
    method: 'PUT',
    body: 'other',
    comparedHeaders: ['x-echo'],
    expected: {
      status: 202,
      body: 'PUT:other',
      headers: { 'x-echo': 'entry' },
    },
  },
  {
    name: 'GET a missing asset',
    path: '/assets/not-a-real-bundle.js',
    method: 'GET',
    headers: { accept: '*/*', 'sec-fetch-dest': 'script' },
    comparedHeaders: [],
  },
  {
    // A real browser preflight. Vite's own CORS middleware answered it before
    // any plugin middleware ran, so development returned
    // `Access-Control-Allow-Origin` and `Vary: Origin` for a request the
    // deployed host answered with neither: a cross-origin form or fetch worked
    // all through development and failed once deployed. Comparing only the
    // status hid it, so every header a preflight reads is compared here.
    name: 'OPTIONS preflighting a route',
    path: '/',
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:3000',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'x-test',
    },
    comparedHeaders: [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-allow-credentials',
      'access-control-max-age',
      'allow',
      'vary',
      'x-host-parity-options',
    ],
    expected: {
      status: 204,
      body: '',
      headers: {
        'access-control-allow-origin': '<absent>',
        'access-control-allow-methods': '<absent>',
        'access-control-allow-headers': '<absent>',
        'access-control-allow-credentials': '<absent>',
        'access-control-max-age': '<absent>',
        allow: EXPECTED_ALLOW,
        vary: '<absent>',
        'x-host-parity-options': 'entry',
      },
    },
  },
  {
    // The entry answers the preflight, so it can see the route. A host that
    // settled OPTIONS itself would answer both paths identically and no
    // application policy could tell them apart.
    name: 'OPTIONS preflighting a deep route',
    path: '/deep/route',
    method: 'OPTIONS',
    headers: { origin: 'http://localhost:3000' },
    comparedHeaders: [
      'allow',
      'vary',
      'access-control-allow-origin',
      'x-host-parity-options',
    ],
    expected: {
      status: 204,
      headers: { 'x-host-parity-options': 'entry' },
    },
  },
  {
    // An ordinary OPTIONS request is not a CORS preflight. The URL suffix does
    // not make it a static request, since static hosts serve only GET and HEAD.
    name: 'ordinary OPTIONS to an asset-looking path',
    path: '/submit.json',
    method: 'OPTIONS',
    comparedHeaders: [
      'access-control-allow-origin',
      'allow',
      'vary',
      'x-host-parity-options',
    ],
    expected: {
      status: 204,
      headers: { 'x-host-parity-options': 'entry' },
    },
  },
  {
    // The requested method owns the preflight. Static hosts serve an
    // asset-looking path only for GET or HEAD; a POST to the same URL reaches
    // the application, so its preflight must reach the entry too.
    name: 'OPTIONS preflighting POST to an asset-looking path',
    path: '/submit.json',
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:3000',
      'access-control-request-method': 'POST',
    },
    comparedHeaders: [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'allow',
      'vary',
      'x-host-parity-options',
    ],
    expected: {
      status: 204,
      headers: { 'x-host-parity-options': 'entry' },
    },
  },
  {
    // Vite's CORS middleware runs before the ordinary plugin middleware. It
    // must not settle a source-looking preflight before Foldkit rejects an
    // absolute or network-path target naming another origin.
    name: 'OPTIONS with an off-origin source-looking target',
    path: '//evil.example/../src/entry.ts',
    method: 'OPTIONS',
    headers: {
      origin: 'http://localhost:3000',
      'access-control-request-method': 'GET',
    },
    comparedHeaders: [
      'access-control-allow-origin',
      'allow',
      'vary',
      'x-host-parity-options',
    ],
    expected: {
      status: 400,
      headers: { 'x-host-parity-options': '<absent>' },
    },
  },
  {
    name: 'TRACE refused by the host',
    path: '/',
    method: 'TRACE',
    comparedHeaders: ['allow'],
  },
  {
    // Node's HTTP parser rejects the method before any handler sees it, so both
    // hosts answer 400 rather than the host's own 405. The probe is here
    // because that agreement is the contract, not because Foldkit produces it.
    name: 'TRACK refused before any handler',
    path: '/',
    method: 'TRACK',
    comparedHeaders: ['allow'],
  },
  {
    name: 'TRACE with an off-origin request target',
    path: '//evil.example/../deep/route',
    method: 'TRACE',
    comparedHeaders: ['allow'],
  },
  {
    name: 'GET a deep application route',
    path: '/deep/route',
    method: 'GET',
    headers: { accept: 'text/html' },
    comparedHeaders: ['content-type'],
  },
]

const VITE_SOURCE_PROBE: Probe = {
  name: 'GET Vite-owned source with Origin',
  path: '/src/entry.ts',
  method: 'GET',
  headers: { origin: 'http://localhost:3000' },
  comparedHeaders: ['access-control-allow-origin'],
}

type Answer = Readonly<{
  status: number
  body: string
  headers: Readonly<Record<string, string>>
}>

// NOTE: `fetch` refuses to construct a TRACE or TRACK request, which is the same
// restriction that made forwarding one to the entry a 500, and it silently drops
// an `Origin` header because the Fetch specification forbids setting one. A
// preflight without `Origin` is not a preflight: Vite's CORS layer ignored it,
// and the gate compared two identical non-answers while a real browser saw the
// two hosts disagree. A raw client is the only way to ask these questions.
const RAW_CLIENT_METHODS: ReadonlySet<string> = new Set([
  'OPTIONS',
  'TRACE',
  'TRACK',
])

const askRaw = (origin: string, probe: Probe): Promise<Answer> =>
  new Promise((resolveAnswer, reject) => {
    const { hostname, port } = new URL(origin)
    const clientRequest = request(
      {
        hostname,
        port,
        path: probe.path,
        method: probe.method,
        headers: { ...probe.headers },
      },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () => {
          const headers: Record<string, string> = {}
          for (const name of probe.comparedHeaders) {
            const value = response.headers[name]
            headers[name] = Array.isArray(value)
              ? value.join(', ')
              : (value ?? '<absent>')
          }
          resolveAnswer({
            status: response.statusCode ?? 0,
            body,
            headers,
          })
        })
      },
    )
    clientRequest.on('error', reject)
    if (probe.body !== undefined) {
      clientRequest.write(probe.body)
    }
    clientRequest.end()
  })

const ask = async (origin: string, probe: Probe): Promise<Answer> => {
  if (
    RAW_CLIENT_METHODS.has(probe.method) ||
    probe.headers?.['origin'] !== undefined
  ) {
    return askRaw(origin, probe)
  }
  const response = await fetch(`${origin}${probe.path}`, {
    method: probe.method,
    headers: { ...probe.headers },
    ...(probe.body === undefined ? {} : { body: probe.body }),
    redirect: 'manual',
  })
  const headers: Record<string, string> = {}
  for (const name of probe.comparedHeaders) {
    headers[name] = response.headers.get(name) ?? '<absent>'
  }
  return { status: response.status, body: await response.text(), headers }
}

const collectExpectationDifferences = (
  differences: Array<string>,
  hostLabel: string,
  probe: Probe,
  answer: Answer,
): void => {
  const expected = probe.expected
  if (expected === undefined) {
    return
  }
  if (answer.status !== expected.status) {
    differences.push(
      `${hostLabel}, ${probe.name}: answered ${String(answer.status)}, ` +
        `expected ${String(expected.status)}`,
    )
  }
  if (expected.body !== undefined && answer.body !== expected.body) {
    differences.push(
      `${hostLabel}, ${probe.name}: body was ${JSON.stringify(answer.body)}, ` +
        `expected ${JSON.stringify(expected.body)}`,
    )
  }
  for (const [name, expectedValue] of Object.entries(expected.headers ?? {})) {
    if (answer.headers[name] !== expectedValue) {
      differences.push(
        `${hostLabel}, ${probe.name}: ${name} was ` +
          `${JSON.stringify(answer.headers[name])}, expected ` +
          JSON.stringify(expectedValue),
      )
    }
  }
}

const builtAssetPath = (): string => {
  const template = readFileSync(
    resolve(EXAMPLE_DIR, 'dist/client/index.html'),
    'utf8',
  )
  const source = /<script[^>]+src="([^"]+\.js)"/.exec(template)?.[1]
  if (source === undefined) {
    throw new ParityError('the built template did not name a JavaScript asset')
  }
  if (!source.startsWith('/')) {
    fail('the built template did not name an absolute-path JavaScript asset')
  }
  return source
}

const assertBuiltRequestTargets = async (origin: string): Promise<void> => {
  const assetPath = builtAssetPath()
  const originForm = await askRaw(origin, {
    name: 'origin-form asset',
    path: assetPath,
    method: 'GET',
    comparedHeaders: [],
  })
  if (originForm.status !== 200 || originForm.body === '') {
    fail(
      `the built asset ${assetPath} answered ${String(originForm.status)} ` +
        'or had an empty body, so raw-target checks could pass vacuously',
    )
  }

  const absoluteForm = await askRaw(origin, {
    name: 'same-origin absolute-form asset',
    path: `${origin}${assetPath}`,
    method: 'GET',
    comparedHeaders: [],
  })
  if (absoluteForm.status !== 200 || absoluteForm.body !== originForm.body) {
    fail(
      'the built host did not normalize a same-origin absolute-form target ' +
        `before static serving (${String(absoluteForm.status)}).`,
    )
  }

  const relativeAssetPath = assetPath.slice(1)
  for (const target of [
    `//evil.example/../${relativeAssetPath}`,
    `//evil.example/%2e%2e/${relativeAssetPath}`,
  ]) {
    const refused = await askRaw(origin, {
      name: 'off-origin static bypass',
      path: target,
      method: 'GET',
      comparedHeaders: [],
    })
    if (refused.status !== 400 || refused.body === originForm.body) {
      fail(
        `the built host answered raw target ${JSON.stringify(target)} with ` +
          `${String(refused.status)} and may have exposed the static asset.`,
      )
    }
  }
  log('built raw request targets: same-origin asset 200, off-origin forms 400')
}

const waitForOrigin = async (origin: string): Promise<void> => {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      await fetch(origin, { method: 'GET' })
      return
    } catch {
      await new Promise(resolveWait => setTimeout(resolveWait, 250))
    }
  }
  fail(`${origin} never accepted a connection`)
}

const runRequired = (
  label: string,
  command: string,
  commandArguments: ReadonlyArray<string>,
): void => {
  log(label)
  const result = spawnSync(command, [...commandArguments], {
    cwd: EXAMPLE_DIR,
    encoding: 'utf-8',
    env: { ...process.env, FOLDKIT_BUILD_ID: HOST_PARITY_BUILD_ID },
    stdio: 'pipe',
    timeout: 600_000,
  })
  if (result.status !== 0) {
    fail(`${label} failed:\n${result.stdout}${result.stderr}`)
  }
}

const readServerBundle = (): string => readFileSync(SERVER_BUNDLE, 'utf8')

const assertNormalBundleHasNoParityMarkers = (): void => {
  const bundle = readServerBundle()
  for (const marker of HOST_PARITY_MARKERS) {
    if (bundle.includes(marker)) {
      fail(
        `the normal SSR example server bundle contains the host-parity ` +
          `marker ${JSON.stringify(marker)}`,
      )
    }
  }
}

const buildHostParityFixture = (): void => {
  runRequired('Building the host-parity app...', 'pnpm', [
    'exec',
    'vite',
    'build',
    '--config',
    HOST_PARITY_CONFIG,
  ])

  const bundle = readServerBundle()
  for (const marker of HOST_PARITY_MARKERS) {
    if (!bundle.includes(marker)) {
      fail(
        `the test-only server bundle omitted host-parity marker ` +
          `${JSON.stringify(marker)}, so the probes could pass against the ` +
          'public entry instead of the fixture',
      )
    }
  }
}

// NOTE: its own process group, killed as a group. `pnpm exec vite` spawns the
// dev server as a child, so killing the pnpm process alone leaves the server
// holding the port. The next run then binds nothing (`--strictPort` refuses)
// and probes a host from an earlier build, which reports agreement that the
// running code never produced.
const startHost = (
  command: string,
  commandArguments: ReadonlyArray<string>,
  port: number,
): ChildProcess =>
  spawn(command, [...commandArguments], {
    cwd: EXAMPLE_DIR,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
    detached: true,
  })

const stopHost = (host: ChildProcess): void => {
  if (host.pid === undefined) {
    return
  }
  try {
    process.kill(-host.pid, 'SIGTERM')
  } catch {
    host.kill()
  }
}

// A host left behind by an earlier run answers on the same port, and
// `--strictPort` makes the new dev server exit rather than take it over, so the
// probes below would report agreement that the code in the tree never produced.
// Refusing to start on a busy port is what keeps a leaked process from reading
// as a pass.
const assertPortIsFree = async (port: number): Promise<void> => {
  try {
    await fetch(`http://localhost:${String(port)}/`, { method: 'GET' })
  } catch {
    return
  }
  fail(
    `something is already listening on port ${String(port)}. A host left over ` +
      'from an earlier run would answer these probes instead of the one this ' +
      'gate starts. Stop it and run again.',
  )
}

const assertNormalExampleHasNoParityResponses = async (): Promise<void> => {
  const origin = `http://localhost:${String(NORMAL_BUILT_PORT)}`
  const host = startHost('node', ['scripts/serve.mjs'], NORMAL_BUILT_PORT)
  try {
    await waitForOrigin(origin)
    const echo = await ask(origin, {
      name: 'normal example echo path',
      path: '/echo',
      method: 'POST',
      body: 'payload',
      comparedHeaders: ['x-echo'],
    })
    if (
      echo.status !== 200 ||
      echo.body === 'POST:payload' ||
      !echo.body.includes('data-foldkit-app') ||
      echo.headers['x-echo'] !== '<absent>'
    ) {
      fail(
        'the normal SSR example exposed the synthetic echo response: ' +
          JSON.stringify(echo),
      )
    }

    const entryCors = await ask(origin, {
      name: 'normal example entry CORS path',
      path: '/entry-cors',
      method: 'GET',
      headers: {
        accept: 'text/html',
        origin: 'https://browser.example',
      },
      comparedHeaders: [
        'access-control-allow-credentials',
        'access-control-allow-origin',
        'x-cors-owner',
      ],
    })
    if (
      entryCors.status !== 200 ||
      entryCors.body === 'entry cors' ||
      !entryCors.body.includes('data-foldkit-app') ||
      entryCors.headers['access-control-allow-credentials'] !== '<absent>' ||
      entryCors.headers['access-control-allow-origin'] !== '<absent>' ||
      entryCors.headers['x-cors-owner'] !== '<absent>'
    ) {
      fail(
        'the normal SSR example exposed the synthetic CORS response: ' +
          JSON.stringify(entryCors),
      )
    }

    const options = await ask(origin, {
      name: 'normal example OPTIONS policy',
      path: '/',
      method: 'OPTIONS',
      headers: {
        origin: 'https://browser.example',
        'access-control-request-method': 'POST',
      },
      comparedHeaders: [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers',
        'access-control-allow-credentials',
        'access-control-max-age',
        'allow',
        'vary',
        'x-host-parity-options',
      ],
    })
    if (
      options.status !== 204 ||
      options.body !== '' ||
      options.headers['access-control-allow-origin'] !== '<absent>' ||
      options.headers['access-control-allow-methods'] !== '<absent>' ||
      options.headers['access-control-allow-headers'] !== '<absent>' ||
      options.headers['access-control-allow-credentials'] !== '<absent>' ||
      options.headers['access-control-max-age'] !== '<absent>' ||
      options.headers['allow'] !== EXPECTED_ALLOW ||
      options.headers['vary'] !== '<absent>' ||
      options.headers['x-host-parity-options'] !== '<absent>'
    ) {
      fail(
        'the normal SSR example changed its safe OPTIONS response: ' +
          JSON.stringify(options),
      )
    }
  } finally {
    stopHost(host)
  }
  log('normal SSR example contains and exposes no host-parity probes')
}

const main = async (): Promise<void> => {
  for (const { port } of DEV_HOST_VARIANTS) {
    await assertPortIsFree(port)
  }
  await assertPortIsFree(BUILT_PORT)
  await assertPortIsFree(NORMAL_BUILT_PORT)

  if (!isSkipBuild) {
    runRequired('Building the example...', 'pnpm', ['build'])
  }
  assertNormalBundleHasNoParityMarkers()
  await assertNormalExampleHasNoParityResponses()
  buildHostParityFixture()

  // NOTE: each variant uses the explicit `vite dev` CLI path. In addition to
  // the configured default, the two CLI flags exercise the precedence path
  // that a programmatic createServer test cannot reach.
  const devHosts = DEV_HOST_VARIANTS.map(variant => ({
    ...variant,
    process: startHost(
      'pnpm',
      [
        'exec',
        'vite',
        'dev',
        '--config',
        HOST_PARITY_CONFIG,
        '--port',
        String(variant.port),
        '--strictPort',
        ...variant.cliArguments,
      ],
      variant.port,
    ),
  }))
  const builtHost = startHost('node', ['scripts/serve.mjs'], BUILT_PORT)
  const builtOrigin = `http://localhost:${BUILT_PORT}`

  try {
    for (const { port } of DEV_HOST_VARIANTS) {
      await waitForOrigin(`http://localhost:${String(port)}`)
    }
    await waitForOrigin(builtOrigin)
    await assertBuiltRequestTargets(builtOrigin)

    const differences: Array<string> = []
    for (const variant of DEV_HOST_VARIANTS) {
      const devOrigin = `http://localhost:${String(variant.port)}`
      for (const probe of PROBES) {
        const dev = await ask(devOrigin, probe)
        const built = await ask(builtOrigin, probe)

        collectExpectationDifferences(
          differences,
          `${variant.label} dev`,
          probe,
          dev,
        )
        collectExpectationDifferences(
          differences,
          `${variant.label} built`,
          probe,
          built,
        )

        if (dev.status !== built.status) {
          differences.push(
            `${variant.label}, ${probe.name}: dev answered ${dev.status}, ` +
              `built answered ${built.status}`,
          )
        }
        for (const name of probe.comparedHeaders) {
          if (dev.headers[name] !== built.headers[name]) {
            differences.push(
              `${variant.label}, ${probe.name}: ${name} was ` +
                `"${dev.headers[name]}" in dev and ` +
                `"${built.headers[name]}" built`,
            )
          }
        }
        // Rendered HTML differs by timestamps, so only responses with a fixed
        // body in the fixture are compared byte for byte.
        if (probe.expected?.body !== undefined && dev.body !== built.body) {
          differences.push(
            `${variant.label}, ${probe.name}: dev body "${dev.body}", ` +
              `built body "${built.body}"`,
          )
        }
        log(
          dev.status === built.status
            ? `${variant.label}, ${probe.name}: ${dev.status} in both`
            : `${variant.label}, ${probe.name}: dev ${dev.status}, built ${built.status}`,
        )
      }

      const source = await ask(devOrigin, VITE_SOURCE_PROBE)
      const sourceCorsOrigin = source.headers['access-control-allow-origin']
      const expectedSourceCorsOrigin =
        variant.expectedSourceCorsOrigin ?? '<absent>'
      if (
        source.status !== 200 ||
        sourceCorsOrigin !== expectedSourceCorsOrigin
      ) {
        differences.push(
          `${variant.label}, ${VITE_SOURCE_PROBE.name}: status was ` +
            `${String(source.status)} and Access-Control-Allow-Origin was ` +
            `"${sourceCorsOrigin}", expected 200 and ` +
            `"${expectedSourceCorsOrigin}"`,
        )
      }
      log(
        `${variant.label}, ${VITE_SOURCE_PROBE.name}: ${String(source.status)}, ` +
          `Access-Control-Allow-Origin ${sourceCorsOrigin}`,
      )
    }

    if (differences.length > 0) {
      fail(`the two hosts disagree:\n  ${differences.join('\n  ')}`)
    }
  } finally {
    for (const devHost of devHosts) {
      stopHost(devHost.process)
    }
    stopHost(builtHost)
  }

  log('PASS')
}

const messageFor = (error: unknown): string => {
  if (error instanceof ParityError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}

main().catch((error: unknown) => {
  console.error(`[host-parity] FAIL: ${messageFor(error)}`)
  process.exit(1)
})
