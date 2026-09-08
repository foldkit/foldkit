import { Array } from 'effect'
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { request } from 'node:http'
import { createRequire } from 'node:module'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { delimiter, extname, join } from 'node:path'

// A freshly generated SSR and SSG application, built through the command its
// own README documents, with every Foldkit dependency installed from the
// tarballs in this release snapshot.
//
// The scaffold's build is where the build id contract is either kept or lost.
// Hydration needs the client build and the server build of one run to carry the
// same id, and a hydratable render with none fails outright, so a generated
// project has to satisfy a requirement its author has not read about yet. This
// gate asserts the generated project does: it builds, the served or generated
// page carries an id, the client bundle carries the same one, Chromium adopts
// the server DOM, and the generated application responds to interaction.
//
// Checking the template files says nothing about this. Only running the
// generated project's own build command does.

const CLI_DIR = 'packages/create-foldkit-app'
const REPO_ROOT = process.cwd()

type ScaffoldPackage = Readonly<{
  directory: string
  name: string
}>

const SCAFFOLD_PACKAGES: ReadonlyArray<ScaffoldPackage> = [
  { directory: 'packages/foldkit', name: 'foldkit' },
  { directory: 'packages/ui', name: '@foldkit/ui' },
  { directory: 'packages/devtools', name: '@foldkit/devtools' },
  {
    directory: 'packages/vite-plugin-foldkit',
    name: '@foldkit/vite-plugin',
  },
  { directory: 'packages/devtools-mcp', name: '@foldkit/devtools-mcp' },
  {
    directory: 'packages/oxlint-plugin-foldkit',
    name: '@foldkit/oxlint-plugin',
  },
]

const DEPENDENCY_MANIFESTS_DIRECTORY_ENV =
  'CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY'
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

const SSR_PORT = 5312
const SSG_PORT = 5313
const BUILD_ID_ATTRIBUTE = /data-foldkit-build="([^"]*)"/
const EXPECTED_ALLOW = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
const HOST_OUTPUT_LIMIT = 16_000
const HOST_READY_ATTEMPTS = 60
const HOST_REQUEST_TIMEOUT_MS = 5_000
const HOST_STOP_TIMEOUT_MS = 3_000
const HYDRATION_TIMEOUT_MS = 10_000

const isSkipBuild = process.argv.includes('--skip-build')

class ScaffoldCheckError extends Error {}

const log = (message: string): void => {
  console.log(`[scaffold-ssr] ${message}`)
}

const fail = (message: string): never => {
  throw new ScaffoldCheckError(message)
}

const assertScaffold: (
  condition: boolean,
  message: string,
) => asserts condition = (
  condition: boolean,
  message: string,
): asserts condition => {
  if (!condition) {
    fail(message)
  }
}

type RunOptions = Readonly<{
  cwd?: string
  env?: Readonly<Record<string, string>>
  inherit?: boolean
  timeoutMs?: number
}>

type CliReleaseManifest = Readonly<{
  packages: Readonly<Record<string, string>>
}>

type RunResult = Readonly<{
  stdout: string
  stderr: string
  status: number | null
}>

const run = (
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...options.env },
    stdio: options.inherit ? 'inherit' : 'pipe',
    timeout: options.timeoutMs ?? 300_000,
  })
  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
    status: result.status,
  }
}

const runRequired = (
  label: string,
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  log(label)
  const result = run(command, args, options)
  if (result.status !== 0) {
    const output = `${result.stdout}${result.stderr}`.trim()
    fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
  }
  return result
}

type RunningHost = Readonly<{
  process: ChildProcess
  port: number
  output: () => string
}>

const activeHosts = new Set<RunningHost>()
const stoppingHosts = new WeakMap<RunningHost, Promise<void>>()

const tryBindPort = (port: number): Promise<Error | undefined> =>
  new Promise(resolveResult => {
    const server = createNetServer()
    server.once('error', error => resolveResult(error))
    server.listen(port, '127.0.0.1', () => {
      server.close(error => resolveResult(error ?? undefined))
    })
  })

const assertPortIsFree = async (port: number): Promise<void> => {
  const error = await tryBindPort(port)
  if (error !== undefined) {
    fail(
      `port ${String(port)} is already in use. A host left by an earlier run ` +
        'would answer this gate instead of the generated project.',
    )
  }
}

const waitForPortToClose = async (port: number): Promise<void> => {
  for (let attempt = 0; attempt < 30; attempt++) {
    if ((await tryBindPort(port)) === undefined) {
      return
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  }
  fail(`the generated host did not release port ${String(port)}`)
}

const startHost = (
  command: string,
  args: ReadonlyArray<string>,
  projectDir: string,
  port: number,
  env: Readonly<Record<string, string>> = {},
): RunningHost => {
  let output = ''
  const host = spawn(command, [...args], {
    cwd: projectDir,
    detached: true,
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const capture = (chunk: Buffer | string): void => {
    output = `${output}${String(chunk)}`.slice(-HOST_OUTPUT_LIMIT)
  }
  host.stdout?.on('data', capture)
  host.stderr?.on('data', capture)
  host.on('error', error => capture(error.message))
  const runningHost = {
    process: host,
    port,
    output: () => output,
  }
  activeHosts.add(runningHost)
  return runningHost
}

const waitForExit = (
  host: ChildProcess,
  timeoutMs: number,
): Promise<boolean> => {
  if (host.exitCode !== null || host.signalCode !== null) {
    return Promise.resolve(true)
  }
  return new Promise(resolveExit => {
    const onExit = (): void => {
      clearTimeout(timeout)
      resolveExit(true)
    }
    const timeout = setTimeout(() => {
      host.off('exit', onExit)
      resolveExit(false)
    }, timeoutMs)
    host.once('exit', onExit)
  })
}

const terminateHost = (host: ChildProcess, isForce: boolean): void => {
  if (host.pid === undefined) {
    return
  }
  if (process.platform === 'win32') {
    spawnSync(
      'taskkill',
      ['/PID', String(host.pid), '/T', ...(isForce ? ['/F'] : [])],
      { stdio: 'ignore' },
    )
    return
  }
  try {
    process.kill(-host.pid, isForce ? 'SIGKILL' : 'SIGTERM')
  } catch {
    host.kill(isForce ? 'SIGKILL' : 'SIGTERM')
  }
}

const stopHost = (host: RunningHost): Promise<void> => {
  const existing = stoppingHosts.get(host)
  if (existing !== undefined) {
    return existing
  }

  const stopping = (async () => {
    terminateHost(host.process, false)
    const didExit = await waitForExit(host.process, HOST_STOP_TIMEOUT_MS)
    const isPortStillOpen = (await tryBindPort(host.port)) !== undefined
    if (!didExit || isPortStillOpen) {
      terminateHost(host.process, true)
      await waitForExit(host.process, HOST_STOP_TIMEOUT_MS)
    }
    await waitForPortToClose(host.port)
  })().finally(() => activeHosts.delete(host))
  stoppingHosts.set(host, stopping)
  return stopping
}

let isStoppingForSignal = false

const stopForSignal = (exitCode: number): void => {
  if (isStoppingForSignal) {
    return
  }
  isStoppingForSignal = true
  void Promise.allSettled(globalThis.Array.from(activeHosts, stopHost)).then(
    () => process.exit(exitCode),
  )
}

process.once('SIGINT', () => stopForSignal(130))
process.once('SIGTERM', () => stopForSignal(143))

const fetchServedPage = async (
  host: RunningHost,
  origin: string,
  path = '/',
): Promise<string> => {
  const url = `${origin}${path}`
  for (let attempt = 0; attempt < HOST_READY_ATTEMPTS; attempt++) {
    if (host.process.exitCode !== null || host.process.signalCode !== null) {
      fail(`the generated host exited before serving ${url}:\n${host.output()}`)
    }
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_000),
      })
      assertScaffold(
        response.status === 200,
        `the generated host answered ${response.status} for ${url}`,
      )
      return await response.text()
    } catch (error) {
      if (error instanceof ScaffoldCheckError) {
        throw error
      }
      await new Promise(resolveWait => setTimeout(resolveWait, 250))
    }
  }
  return fail(
    `the generated host never accepted a connection at ${url}:\n${host.output()}`,
  )
}

type RawAnswer = Readonly<{
  status: number
  body: string
  headers: Readonly<Record<string, string | undefined>>
}>

const askRaw = (
  origin: string,
  path: string,
  method: string,
  headers: Readonly<Record<string, string>> = {},
): Promise<RawAnswer> =>
  new Promise((resolveAnswer, reject) => {
    const { hostname, port } = new URL(origin)
    const clientRequest = request(
      {
        hostname,
        port,
        path,
        method,
        headers: { ...headers },
        signal: AbortSignal.timeout(HOST_REQUEST_TIMEOUT_MS),
      },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('error', reject)
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () => {
          const responseHeaders: Record<string, string | undefined> = {}
          for (const [name, value] of Object.entries(response.headers)) {
            responseHeaders[name] = globalThis.Array.isArray(value)
              ? value.join(', ')
              : value
          }
          resolveAnswer({
            status: response.statusCode ?? 0,
            body,
            headers: responseHeaders,
          })
        })
      },
    )
    clientRequest.on('error', reject)
    clientRequest.end()
  })

type PlaywrightConsoleMessage = Readonly<{
  type: () => string
  text: () => string
}>

type PlaywrightLocator = Readonly<{
  click: () => Promise<void>
  textContent: () => Promise<string | null>
}>

type PlaywrightResponse = Readonly<{
  status: () => number
  text: () => Promise<string>
}>

type PlaywrightRoute = Readonly<{
  fetch: () => Promise<PlaywrightResponse>
  fulfill: (options: {
    response: PlaywrightResponse
    body: string
  }) => Promise<void>
}>

type PlaywrightPage = Readonly<{
  route: (
    url: string,
    handler: (route: PlaywrightRoute) => Promise<void>,
  ) => Promise<void>
  goto: (
    url: string,
    options: { waitUntil: 'domcontentloaded' },
  ) => Promise<PlaywrightResponse | null>
  waitForFunction: (
    expression: string,
    argument?: unknown,
    options?: { timeout?: number },
  ) => Promise<void>
  evaluate: <A>(expression: string) => Promise<A>
  locator: (selector: string) => PlaywrightLocator
  getByRole: (role: string, options: { name: string }) => PlaywrightLocator
  url: () => string
  on: {
    (event: 'pageerror', listener: (error: Error) => void): void
    (
      event: 'console',
      listener: (message: PlaywrightConsoleMessage) => void,
    ): void
  }
  close: () => Promise<void>
}>

type PlaywrightBrowser = Readonly<{
  newPage: () => Promise<PlaywrightPage>
  close: () => Promise<void>
}>

type PlaywrightBrowserType = Readonly<{
  launch: (options: { executablePath?: string }) => Promise<PlaywrightBrowser>
}>

const loadChromium = (): PlaywrightBrowserType => {
  const requireFromE2e = createRequire(
    join(REPO_ROOT, 'packages/examples-e2e/package.json'),
  )
  const playwright: Readonly<{ chromium: PlaywrightBrowserType }> =
    requireFromE2e('playwright')
  return playwright.chromium
}

type HydratedPage = Readonly<{
  page: PlaywrightPage
  diagnostics: globalThis.Array<string>
}>

type AdoptionReading = Readonly<{
  rootWasCaptured: boolean
  sentinelWasCaptured: boolean
  rootContainsCurrentSentinel: boolean
  rootIsConnected: boolean
  sentinelIsSame: boolean
  buildMarkerIsRemoved: boolean
  bodyIsContained: boolean
}>

const openHydratedPage = async (
  browser: PlaywrightBrowser,
  url: string,
  sentinelExpression: string,
  label: string,
): Promise<HydratedPage> => {
  const page = await browser.newPage()
  const diagnostics: globalThis.Array<string> = []
  page.on('pageerror', error =>
    diagnostics.push(`page error: ${error.message}`),
  )
  page.on('console', message => {
    if (message.type() === 'error') {
      diagnostics.push(`console error: ${message.text()}`)
    }
  })

  try {
    await page.route(url, async route => {
      const response = await route.fetch()
      const html = await response.text()
      assertScaffold(
        html.includes('</body>'),
        `${label} has no closing body for the parser-time identity probe`,
      )
      const probe =
        '<script>' +
        "window.__foldkitServedRoot=document.querySelector('[data-foldkit-app]');" +
        `window.__foldkitServedSentinel=${sentinelExpression};` +
        '</script>'
      await route.fulfill({
        response,
        body: html.replace('</body>', `${probe}</body>`),
      })
    })

    const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
    assertScaffold(
      response?.status() === 200,
      `${label} navigation answered ${String(response?.status())}`,
    )
    try {
      await page.waitForFunction(
        "window.__foldkitServedRoot instanceof Element && !window.__foldkitServedRoot.hasAttribute('data-foldkit-build')",
        undefined,
        { timeout: HYDRATION_TIMEOUT_MS },
      )
    } catch (error) {
      const state = await page.evaluate<unknown>(`(() => {
        const root = window.__foldkitServedRoot
        return {
          bodyInert: document.body.inert,
          bodyRefused: document.body.hasAttribute('data-foldkit-refused'),
          buildId: root?.getAttribute('data-foldkit-build'),
          rootConnected: root?.isConnected,
        }
      })()`)
      fail(
        `${label} did not finish hydration: ${JSON.stringify({
          state,
          diagnostics,
          error: error instanceof Error ? error.message : String(error),
        })}`,
      )
    }

    const reading = await page.evaluate<AdoptionReading>(`(() => {
      const root = window.__foldkitServedRoot
      const sentinel = ${sentinelExpression}
      return {
        rootWasCaptured: window.__foldkitServedRoot instanceof Element,
        sentinelWasCaptured:
          window.__foldkitServedSentinel instanceof Element,
        rootContainsCurrentSentinel:
          root instanceof Element &&
          sentinel instanceof Element &&
          root.contains(sentinel),
        rootIsConnected: window.__foldkitServedRoot?.isConnected === true,
        sentinelIsSame:
          window.__foldkitServedSentinel === sentinel,
        buildMarkerIsRemoved:
          root instanceof Element && !root.hasAttribute('data-foldkit-build'),
        bodyIsContained:
          document.body.inert ||
          document.body.hasAttribute('data-foldkit-refused') ||
          document.body.getAttribute('aria-hidden') === 'true',
      }
    })()`)
    assertScaffold(
      reading.rootWasCaptured && reading.sentinelWasCaptured,
      `${label} did not expose its parser-created root and sentinel node`,
    )
    assertScaffold(
      reading.rootContainsCurrentSentinel &&
        reading.rootIsConnected &&
        reading.sentinelIsSame,
      `${label} rebuilt instead of adopting its parser-created DOM: ` +
        JSON.stringify(reading),
    )
    assertScaffold(
      reading.buildMarkerIsRemoved && !reading.bodyIsContained,
      `${label} did not complete hydration normally: ${JSON.stringify(reading)}`,
    )
    return { page, diagnostics }
  } catch (error) {
    await page.close()
    throw error
  }
}

const assertNoBrowserDiagnostics = (
  label: string,
  diagnostics: ReadonlyArray<string>,
): void => {
  assertScaffold(
    Array.isReadonlyArrayEmpty(diagnostics),
    `${label} emitted browser errors:\n${diagnostics.join('\n')}`,
  )
}

type PackOutput = ReadonlyArray<Readonly<{ filename?: string }>>

const packPackage = (label: string, packageDir: string): string => {
  const result = runRequired(label, 'npm', ['pack', '--json'], {
    cwd: join(process.cwd(), packageDir),
  })
  const output: PackOutput = JSON.parse(result.stdout)
  const filename = output[0]?.filename
  assertScaffold(
    filename !== undefined,
    `${label} did not return a tarball filename`,
  )
  return join(process.cwd(), packageDir, filename)
}

const buildIdIn = (html: string): string => {
  const match = BUILD_ID_ATTRIBUTE.exec(html)
  return match?.[1] ?? ''
}

const clientBundleCarries = (clientDir: string, buildId: string): boolean =>
  readdirSync(join(clientDir, 'assets'))
    .filter(name => extname(name) === '.js')
    .some(name =>
      readFileSync(join(clientDir, 'assets', name), 'utf8').includes(buildId),
    )

const assertBuildIdReachesBothSides = (
  label: string,
  html: string,
  clientDir: string,
): string => {
  const buildId = buildIdIn(html)
  assertScaffold(
    buildId !== '',
    `${label} carries no build id on its root. A generated project has to ` +
      'reach a hydratable build through its own build command, without its ' +
      'author having to discover the requirement first.',
  )
  assertScaffold(
    clientBundleCarries(clientDir, buildId),
    `${label} carries build id "${buildId}", which no client bundle shares. ` +
      'Hydration would rebuild every page of the deployment that just shipped.',
  )
  log(`${label}: build id ${buildId} reaches the page and the client bundle`)
  return buildId
}

type Tarballs = Readonly<{
  cli: string
  packages: ReadonlyArray<string>
}>

type DependencyMap = Readonly<Record<string, string>>

type PackageManifest = Readonly<{
  dependencies?: DependencyMap
  devDependencies?: DependencyMap
}>

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'))

const readManifest = (path: string): PackageManifest => readJson(path)

const prepareDependencyManifests = (workspaceDir: string): string => {
  const manifestDirectory = join(workspaceDir, 'dependency-manifests')

  for (const rendering of ['ssr', 'ssg'] as const) {
    const source = readManifest(
      join(REPO_ROOT, 'examples', rendering, 'package.json'),
    )
    const effectSpec = source.dependencies?.['effect']

    assertScaffold(
      effectSpec !== undefined && EXACT_VERSION.test(effectSpec),
      `the ${rendering.toUpperCase()} example must pin effect to one exact ` +
        'version so the scaffold gate can distinguish its local manifest',
    )

    const manifest = {
      ...source,
      dependencies: { ...source.dependencies, effect: `=${effectSpec}` },
    }

    const directory = join(manifestDirectory, rendering)
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      join(directory, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
  }

  return manifestDirectory
}

type PackageManagerShim = Readonly<{
  directory: string
  marker: string
}>

const preparePackageManagerShim = (
  workspaceDir: string,
  projectName: string,
): PackageManagerShim => {
  const directory = join(workspaceDir, 'package-manager-shims', projectName)
  const marker = join(directory, 'attempted-install')
  const source = `const { writeFileSync } = require('node:fs')

if (process.argv.length !== 3 || process.argv[2] !== 'install') {
  console.error('Expected exactly one install command')
  process.exit(1)
}

writeFileSync(${JSON.stringify(marker)}, '')
`

  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'npm-shim.cjs'), source)
  writeFileSync(join(directory, 'npm'), `#!/usr/bin/env node\n${source}`)
  writeFileSync(
    join(directory, 'npm.cmd'),
    '@node "%~dp0\\npm-shim.cjs" %*\r\n',
  )
  chmodSync(join(directory, 'npm'), 0o755)

  return { directory, marker }
}

const assertGeneratedDependencySpecs = (
  rendering: 'ssr' | 'ssg',
  projectDir: string,
  manifestDirectory: string,
  cliReleaseManifest: CliReleaseManifest,
): void => {
  const source = readManifest(
    join(manifestDirectory, rendering, 'package.json'),
  )
  const generated = readManifest(join(projectDir, 'package.json'))

  for (const field of ['dependencies', 'devDependencies'] as const) {
    const generatedDependencies = generated[field] ?? {}

    for (const [name, spec] of Object.entries(source[field] ?? {})) {
      const expected = spec.includes('workspace:')
        ? cliReleaseManifest.packages[name]
        : spec

      assertScaffold(
        expected !== undefined && generatedDependencies[name] === expected,
        `the generated ${rendering.toUpperCase()} ${field} resolved ${name} ` +
          `to ${JSON.stringify(generatedDependencies[name])}, but the local ` +
          `release inputs require ${JSON.stringify(expected)}. The packed CLI ` +
          'did not read its immutable dependency inputs.',
      )
    }
  }

  log(
    `The generated ${rendering.toUpperCase()} dependency specs match the checkout-derived manifest`,
  )
}

const generateProject = (
  workspaceDir: string,
  rendering: 'ssr' | 'ssg',
  tarballs: Tarballs,
  manifestDirectory: string,
): string => {
  const projectName = `my-${rendering}-app`
  const environmentPath = process.env['PATH']
  assertScaffold(
    environmentPath !== undefined,
    'the scaffold gate cannot prepare npm without PATH',
  )
  const packageManagerShim = preparePackageManagerShim(
    workspaceDir,
    projectName,
  )
  const cliReleaseManifest = readJson<CliReleaseManifest>(
    join(
      workspaceDir,
      'node_modules/create-foldkit-app/dist/templates/release.json',
    ),
  )

  runRequired(
    `Generating a ${rendering.toUpperCase()} project...`,
    'node',
    [
      join(workspaceDir, 'node_modules/.bin/create-foldkit-app'),
      '--name',
      projectName,
      '--rendering',
      rendering,
      '--package-manager',
      'npm',
    ],
    {
      cwd: workspaceDir,
      env: {
        [DEPENDENCY_MANIFESTS_DIRECTORY_ENV]: manifestDirectory,
        PATH: `${packageManagerShim.directory}${delimiter}${environmentPath}`,
      },
    },
  )

  const projectDir = join(workspaceDir, projectName)
  assertScaffold(
    existsSync(packageManagerShim.marker),
    `the packed CLI did not ask npm to install the generated ${rendering.toUpperCase()} dependencies`,
  )
  assertGeneratedDependencySpecs(
    rendering,
    projectDir,
    manifestDirectory,
    cliReleaseManifest,
  )

  // NOTE: the packed CLI records exact versions that do not exist in npm until
  // its Version Packages PR merges. Generation uses the shim above to prove it
  // reaches installation without asking the registry for packages that cannot
  // be published yet. This install exercises the same manifest with the full
  // local release snapshot.
  // `--legacy-peer-deps` is needed only because the plugin's peer floor names a
  // version `changeset version` has not produced yet; `check-peer-floors.ts`
  // asserts that floor separately.
  runRequired(
    `Installing this workspace's packages into the ${rendering.toUpperCase()} project...`,
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--no-save',
      '--legacy-peer-deps',
      ...tarballs.packages,
    ],
    { cwd: projectDir },
  )

  runRequired(
    `Building the ${rendering.toUpperCase()} project through its documented build command...`,
    'npm',
    ['run', 'build'],
    { cwd: projectDir, inherit: true },
  )

  return projectDir
}

const assertRejectsRelativeManifestDirectory = (workspaceDir: string): void => {
  const result = run(
    'node',
    [
      join(workspaceDir, 'node_modules/.bin/create-foldkit-app'),
      '--name',
      'invalid-manifest-source',
      '--rendering',
      'ssr',
      '--package-manager',
      'npm',
    ],
    {
      cwd: workspaceDir,
      env: { [DEPENDENCY_MANIFESTS_DIRECTORY_ENV]: 'relative/examples' },
    },
  )
  const output = `${result.stdout}${result.stderr}`
  assertScaffold(
    result.status !== 0 && output.includes('must be an absolute path'),
    'the packed CLI accepted a relative dependency manifest directory or ' +
      `failed without the expected diagnostic:\n${output}`,
  )
  log('The packed CLI refuses a relative dependency manifest directory')
}

const assertGeneratedHostPolicies = async (origin: string): Promise<void> => {
  const offOrigin = await askRaw(origin, '//evil.example/page', 'GET')
  assertScaffold(
    offOrigin.status === 400,
    `the generated SSR host answered an off-origin request target with ` +
      `${String(offOrigin.status)} instead of 400`,
  )

  const missingAsset = await fetch(`${origin}/assets/not-a-real-bundle.js`, {
    headers: { accept: '*/*' },
    signal: AbortSignal.timeout(HOST_REQUEST_TIMEOUT_MS),
  })
  const missingAssetBody = await missingAsset.text()
  assertScaffold(
    missingAsset.status === 404 &&
      !missingAssetBody.includes('data-foldkit-app'),
    'the generated SSR host answered a missing JavaScript asset with ' +
      `${String(missingAsset.status)} or an application shell`,
  )

  const options = await askRaw(origin, '/', 'OPTIONS', {
    origin: 'https://browser.example',
    'access-control-request-method': 'POST',
  })
  assertScaffold(
    options.status === 204 &&
      options.body === '' &&
      options.headers['allow'] === EXPECTED_ALLOW,
    'the generated SSR host did not forward OPTIONS to its entry: ' +
      JSON.stringify(options),
  )
  log(
    'The generated SSR host refuses off-origin targets and missing assets, and forwards OPTIONS',
  )
}

const checkSsrInBrowser = async (
  browser: PlaywrightBrowser,
  origin: string,
): Promise<void> => {
  const hydrated = await openHydratedPage(
    browser,
    `${origin}/deep/route`,
    "document.querySelectorAll('button')[1]",
    'The generated SSR application',
  )
  try {
    const initialCount = await hydrated.page.locator('#count').textContent()
    const provenance = await hydrated.page.locator('#provenance').textContent()
    assertScaffold(
      initialCount === '0' &&
        provenance?.includes('Rendered on the Server') === true,
      'the generated SSR deep route did not preserve its server-rendered state',
    )
    await hydrated.page.getByRole('button', { name: '+' }).click()
    await hydrated.page.waitForFunction(
      "document.querySelector('#count')?.textContent === '1' && document.title === 'Count 1'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    assertNoBrowserDiagnostics(
      'The generated SSR application',
      hydrated.diagnostics,
    )
  } finally {
    await hydrated.page.close()
  }
  log('The generated SSR application hydrates in place and responds to input')
}

const checkSsgInBrowser = async (
  browser: PlaywrightBrowser,
  origin: string,
): Promise<void> => {
  const home = await openHydratedPage(
    browser,
    `${origin}/`,
    "document.querySelector('button')",
    'The generated SSG home page',
  )
  try {
    await home.page.getByRole('button', { name: 'Count: 0' }).click()
    await home.page.waitForFunction(
      "document.querySelector('button')?.textContent === 'Count: 1'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    await home.page.getByRole('link', { name: 'About' }).click()
    await home.page.waitForFunction(
      "document.title === 'About | Foldkit App' && document.querySelector('#page-title')?.textContent === 'Statically generated about page'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    assertScaffold(
      new URL(home.page.url()).pathname === '/about',
      `the generated SSG application navigated to ${home.page.url()} instead of /about`,
    )
    await home.page.getByRole('link', { name: 'Home' }).click()
    await home.page.waitForFunction(
      "document.title === 'Home | Foldkit App' && document.querySelector('button')?.textContent === 'Count: 1'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    assertNoBrowserDiagnostics('The generated SSG home page', home.diagnostics)
  } finally {
    await home.page.close()
  }

  const about = await openHydratedPage(
    browser,
    `${origin}/about/`,
    "document.querySelector('#page-title')",
    'The generated SSG about page',
  )
  try {
    assertScaffold(
      (await about.page.locator('#page-title').textContent()) ===
        'Statically generated about page',
      'the generated SSG about file did not render its own route',
    )
    assertNoBrowserDiagnostics(
      'The generated SSG about page',
      about.diagnostics,
    )
  } finally {
    await about.page.close()
  }
  log(
    'The generated SSG pages hydrate in place and preserve state across navigation',
  )
}

const checkSsr = async (
  workspaceDir: string,
  tarballs: Tarballs,
  manifestDirectory: string,
  browser: PlaywrightBrowser,
): Promise<void> => {
  const projectDir = generateProject(
    workspaceDir,
    'ssr',
    tarballs,
    manifestDirectory,
  )

  const origin = `http://127.0.0.1:${String(SSR_PORT)}`
  const host = startHost('npm', ['run', 'start'], projectDir, SSR_PORT, {
    PORT: String(SSR_PORT),
    ORIGIN: origin,
  })
  try {
    const html = await fetchServedPage(host, origin)
    assertBuildIdReachesBothSides(
      'The generated SSR host',
      html,
      join(projectDir, 'dist/client'),
    )
    await assertGeneratedHostPolicies(origin)
    await checkSsrInBrowser(browser, origin)
  } finally {
    await stopHost(host)
  }
}

const checkSsg = async (
  workspaceDir: string,
  tarballs: Tarballs,
  manifestDirectory: string,
  browser: PlaywrightBrowser,
): Promise<void> => {
  const projectDir = generateProject(
    workspaceDir,
    'ssg',
    tarballs,
    manifestDirectory,
  )
  const clientDir = join(projectDir, 'dist/client')

  const home = readFileSync(join(clientDir, 'index.html'), 'utf8')
  const homeBuildId = assertBuildIdReachesBothSides(
    'The generated SSG home page',
    home,
    clientDir,
  )

  const about = readFileSync(join(clientDir, 'about/index.html'), 'utf8')
  const aboutBuildId = assertBuildIdReachesBothSides(
    'The generated SSG about page',
    about,
    clientDir,
  )

  assertScaffold(
    homeBuildId === aboutBuildId,
    `two pages of one build carry different ids ("${homeBuildId}" and ` +
      `"${aboutBuildId}"), so the prerender step did not run under the id the ` +
      'client build was given.',
  )

  const origin = `http://127.0.0.1:${String(SSG_PORT)}`
  const host = startHost(
    'npm',
    [
      'run',
      'preview',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(SSG_PORT),
      '--strictPort',
    ],
    projectDir,
    SSG_PORT,
  )
  try {
    await fetchServedPage(host, origin)
    await checkSsgInBrowser(browser, origin)
  } finally {
    await stopHost(host)
  }
}

const main = async (): Promise<void> => {
  const tarballPaths: globalThis.Array<string> = []
  const workspaceDir = mkdtempSync(join(tmpdir(), 'foldkit-scaffold-ssr-'))
  log(`Workspace: ${workspaceDir}`)

  try {
    await assertPortIsFree(SSR_PORT)
    await assertPortIsFree(SSG_PORT)
    const manifestDirectory = prepareDependencyManifests(workspaceDir)

    if (!isSkipBuild) {
      const buildFilters = SCAFFOLD_PACKAGES.flatMap(({ name }) => [
        '--filter',
        name,
      ])

      runRequired(
        'Building the packages the generated projects install...',
        'pnpm',
        ['--filter', 'create-foldkit-app', ...buildFilters, 'build'],
        { inherit: true },
      )
    }

    const tarballs: Tarballs = {
      cli: packPackage('Packing create-foldkit-app...', CLI_DIR),
      packages: SCAFFOLD_PACKAGES.map(({ directory, name }) =>
        packPackage(`Packing ${name}...`, directory),
      ),
    }
    tarballPaths.push(tarballs.cli, ...tarballs.packages)

    runRequired(
      'Preparing the generation workspace...',
      'npm',
      ['init', '-y'],
      {
        cwd: workspaceDir,
      },
    )
    runRequired(
      'Installing the packed CLI...',
      'npm',
      ['install', '--no-audit', '--no-fund', tarballs.cli],
      { cwd: workspaceDir },
    )

    assertRejectsRelativeManifestDirectory(workspaceDir)
    const chromium = loadChromium()
    const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
    const browser = await chromium.launch(
      executablePath === undefined ? {} : { executablePath },
    )
    try {
      await checkSsr(workspaceDir, tarballs, manifestDirectory, browser)
      await checkSsg(workspaceDir, tarballs, manifestDirectory, browser)
    } finally {
      await browser.close()
    }
  } finally {
    log('Cleaning up...')
    rmSync(workspaceDir, { recursive: true, force: true })
    for (const path of tarballPaths) {
      rmSync(path, { force: true })
    }
  }

  log('PASS')
}

const messageFor = (error: unknown): string => {
  if (error instanceof ScaffoldCheckError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}

main().catch((error: unknown) => {
  console.error(`[scaffold-ssr] FAIL: ${messageFor(error)}`)
  process.exit(1)
})
