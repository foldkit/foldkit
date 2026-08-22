import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { type Server, createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// A Foldkit application built outside this repository, from packed tarballs,
// with no source alias and no workspace link. Everything about the build id
// depends on that shape and cannot be observed inside the monorepo: an
// installed Foldkit is externalized from the server bundle, where the plugin's
// compile-time define never reaches it, while a source-aliased one is bundled
// and every define lands. A check that runs against the workspace copy proves
// nothing about the artifacts a consumer installs.
//
// What this gate holds:
//
//   1. The server bundle really externalizes Foldkit.
//   2. One deployment id reaches the client bundle and the served root alike.
//   3. Hydration of a same-build page keeps the root and the input element, so
//      live DOM state the markup never carried survives.
//   4. A parser-upgraded Custom Element with view-owned light DOM is replaced.
//      Disconnect-time mutations cannot survive on the old host, an ancestor,
//      or an earlier adopted sibling.
//   5. Hydration of a page from another deployment stops before it reads the
//      handoff, so no code from this build ever owns that page's DOM.
//   6. A hydratable render with no build id fails with the typed error that
//      names what to supply, rather than serving an unprotected page.

const REPO_ROOT = process.cwd()
const FOLDKIT_DIR = 'packages/foldkit'
const PLUGIN_DIR = 'packages/vite-plugin-foldkit'

const BUILD_ID_SERVED = 'deployment-alpha'
const BUILD_ID_CURRENT = 'deployment-beta'
const TYPED_VALUE = 'typed-before-hydration'
const PORT = 5199
const ORIGIN = `http://127.0.0.1:${PORT}`
const DOM_COMMIT_TIMEOUT_MS = 10_000

const isSkipBuild = process.argv.includes('--skip-build')
const isCriticalBrowserMatrix = process.argv.includes(
  '--critical-browser-matrix',
)

class ConsumerCheckError extends Error {}

const log = (message: string): void => {
  console.log(`[packed-ssr] ${message}`)
}

const fail = (message: string): never => {
  throw new ConsumerCheckError(message)
}

const assertConsumer: (
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

type PackOutput = ReadonlyArray<Readonly<{ filename?: string }>>

const parseJson = <T>(raw: string): T => JSON.parse(raw)

const readJson = <T>(path: string): T =>
  parseJson<T>(readFileSync(path, 'utf8'))

const packPackage = (label: string, packageDir: string): string => {
  const result = runRequired(label, 'npm', ['pack', '--json'], {
    cwd: join(REPO_ROOT, packageDir),
  })
  const filename = parseJson<PackOutput>(result.stdout)[0]?.filename
  assertConsumer(
    filename !== undefined,
    `${label} did not return a tarball filename`,
  )
  log(`Packed ${filename}`)
  return join(REPO_ROOT, packageDir, filename)
}

// CONSUMER PROJECT FIXTURE

const CONSUMER_FIXTURE_DIR = join(
  REPO_ROOT,
  'scripts/fixtures/packed-ssr-consumer',
)
const TYPESCRIPT_VERSION = '^6.0.3'

// A low-entropy value the build removes from the client. It exists to prove
// that nothing derived from this module's contents ships: an identity or marker
// carrying a truncated hash of the source would be a published check against
// it, and a four-digit PIN falls to ten thousand guesses.
const SERVER_ONLY_PIN = '0427'

type FixtureValues = Readonly<Record<string, string>>

type ConsumerFixture = Readonly<{
  path: string
  values?: FixtureValues
}>

const CONSUMER_FIXTURES: ReadonlyArray<ConsumerFixture> = [
  {
    path: 'index.html',
    values: { TYPED_VALUE },
  },
  {
    path: 'src/main.ts',
    values: { SERVER_ONLY_PIN },
  },
  { path: 'vite.config.ts' },
  { path: 'scripts/build.mjs' },
  { path: 'scripts/entrypoints.mjs' },
  { path: 'src/entry.ts' },
  { path: 'src/entry.server.ts' },
  { path: 'src/vite-env.d.ts' },
  { path: 'src/packed-types.ts' },
  { path: 'src/inferred-program.ts' },
  { path: 'src/inferred-machine-edge.ts' },
  { path: 'tsconfig.json' },
]

const FIXTURE_TOKEN = /\{\{[A-Z0-9_]+\}\}/g

const readConsumerFixture = ({
  path,
  values = {},
}: ConsumerFixture): string => {
  let source = readFileSync(join(CONSUMER_FIXTURE_DIR, path), 'utf8')
  for (const [name, value] of Object.entries(values)) {
    const marker = `{{${name}}}`
    const token = [`"${marker}"`, `'${marker}'`].find(candidate =>
      source.includes(candidate),
    )
    assertConsumer(
      token !== undefined,
      `the packed consumer fixture ${path} does not contain a quoted ${marker}`,
    )
    source = source.replaceAll(token, () => JSON.stringify(value))
  }
  const unresolvedTokens = [...source.matchAll(FIXTURE_TOKEN)].map(
    match => match.at(0) ?? fail('fixture token match had no text'),
  )
  assertConsumer(
    unresolvedTokens.at(0) === undefined,
    `the packed consumer fixture ${path} has unresolved substitutions: ${unresolvedTokens.join(', ')}`,
  )
  return source
}

const writeConsumerFixtures = (projectDir: string): void => {
  for (const fixture of CONSUMER_FIXTURES) {
    const target = join(projectDir, fixture.path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readConsumerFixture(fixture))
  }
}

// CONSUMER PROJECT

type Manifest = Readonly<{
  name?: string
  version?: string
  peerDependencies?: Readonly<Record<string, string>>
  devDependencies?: Readonly<Record<string, string>>
}>

const writeConsumerProject = (
  projectDir: string,
  foldkitTarball: string,
  pluginTarball: string,
): void => {
  const foldkitManifest = readJson<Manifest>(
    join(REPO_ROOT, FOLDKIT_DIR, 'package.json'),
  )
  const exampleManifest = readJson<Manifest>(
    join(REPO_ROOT, 'examples/ssr/package.json'),
  )
  const effectVersion = foldkitManifest.peerDependencies?.['effect']
  const viteVersion = exampleManifest.devDependencies?.['vite']
  assertConsumer(
    effectVersion !== undefined && viteVersion !== undefined,
    'could not read the effect and vite versions the consumer must install',
  )

  writeFileSync(
    join(projectDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'packed-ssr-consumer',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: { build: 'node scripts/build.mjs' },
        dependencies: {
          effect: effectVersion,
          foldkit: `file:${foldkitTarball}`,
        },
        devDependencies: {
          '@foldkit/vite-plugin': `file:${pluginTarball}`,
          typescript: TYPESCRIPT_VERSION,
          vite: viteVersion,
        },
      },
      null,
      2,
    )}\n`,
  )
  writeConsumerFixtures(projectDir)
}

// Every name the published documentation says ships from
// `foldkit/experimental/server`, imported the way a consumer would. Two of them
// were documented as shipping from there while the packed declarations omitted
// them, which nothing inside the workspace could show: a source path resolves
// them whether or not the barrel re-exports them.
//
// The fixture also sets `declaration`, so it covers a consumer that exports a
// program whose type comes from `makeElement` or `makeApplication`, or a
// Machine Edge built with `to` or `when`. If a type that foldkit exports has a
// key the consumer cannot write, that consumer cannot write its own `.d.ts`
// file at all, and TypeScript reports TS4023.
// `noEmit` still reports it, but only while `declaration` is set. Without
// `declaration` the check never runs.
const assertPackedTypesResolve = (projectDir: string): void => {
  const result = spawnSync('npx', ['tsc', '--noEmit'], {
    cwd: projectDir,
    encoding: 'utf8',
  })
  assertConsumer(
    result.status === 0,
    'a consumer cannot compile against the packed declarations. It imports ' +
      'the documented types from `foldkit/experimental/server`, exports a ' +
      'program built with `makeElement` or `makeApplication`, or exports a ' +
      'Machine Edge built with `to` or `when`:' +
      `\n${result.stdout}${result.stderr}`,
  )
  log('Packed declarations compile, and a consumer can write its own')
}

// ASSERTIONS ON THE BUILT ARTIFACTS

const IMPORT_SPECIFIER =
  /(?:^|[\s;}])(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g

const importSpecifiers = (source: string): ReadonlyArray<string> =>
  [...source.matchAll(IMPORT_SPECIFIER)].map(match => match[1] ?? '')

// A string that only exists inside Foldkit's own source. If the server bundle
// inlined the framework rather than importing it, this travels with it.
const FOLDKIT_INTERNAL_MARKER = 'data-foldkit-build'

const assertServerBundleExternalizesFoldkit = (buildDir: string): void => {
  const bundle = readFileSync(join(buildDir, 'server/entry.server.js'), 'utf8')
  const foldkitImports = importSpecifiers(bundle).filter(
    specifier => specifier === 'foldkit' || specifier.startsWith('foldkit/'),
  )

  assertConsumer(
    foldkitImports.length > 0,
    'the server bundle names no `foldkit` import, so Foldkit was bundled into ' +
      'it rather than externalized. Every build-id assertion below would then ' +
      'describe an inlined copy the plugin could transform, which is not what ' +
      'an installed consumer runs.',
  )
  assertConsumer(
    !bundle.includes(FOLDKIT_INTERNAL_MARKER),
    'the server bundle contains Foldkit internals, so it inlined the framework ' +
      'despite naming an import for it.',
  )
  log(
    `Server bundle imports Foldkit: ${[...new Set(foldkitImports)].join(', ')}`,
  )
}

const clientBundleSources = (buildDir: string): ReadonlyArray<string> => {
  const assetsDir = join(buildDir, 'client/assets')
  return readdirSync(assetsDir)
    .filter(name => extname(name) === '.js')
    .map(name => readFileSync(join(assetsDir, name), 'utf8'))
}

// Nothing the client bundle ships may be a check against the module's source.
// A truncated digest of the whole file would still publish a check against a
// server-only PIN that the client build correctly strips, so the PIN could be
// recovered by hashing the ten thousand candidates until one digest matched.
const assertNoSourceOracle = (buildDir: string): void => {
  const sources = clientBundleSources(buildDir)

  for (const source of sources) {
    if (source.includes(SERVER_ONLY_PIN)) {
      fail(
        'the client bundle contains the server-only value verbatim, so this ' +
          'check cannot say anything about digests of it.',
      )
    }
  }

  // The identity literal the plugin emits. A bundler may keep it as a backtick
  // template, a single-quoted string, or a double-quoted one, so all three are
  // read.
  const IDENTITY_LITERAL = /[`'"]([^`'"\n]*#[A-Za-z_$][^`'"\n]*)[`'"]/g
  const identities = sources
    .flatMap(source => [...source.matchAll(IDENTITY_LITERAL)])
    .filter(([, identity]) => (identity ?? '').includes('/'))
  assertConsumer(
    identities.length > 0,
    'no view identity was found in the client bundle, so this check would ' +
      'pass without looking at anything.',
  )
  for (const [, identity] of identities) {
    assertConsumer(
      !/@[0-9a-f]{8,}/.test(identity ?? ''),
      `the identity "${String(identity)}" carries a digest. A hash of the ` +
        'module source is a published check against that source, which a ' +
        'low-entropy server-only value does not survive.',
    )
  }

  const digestsOfSource = new Set(
    [8, 10, 12, 16].map(length =>
      createHash('sha256')
        .update(readFileSync(join(buildDir, '..', 'src/main.ts'), 'utf8'))
        .digest('hex')
        .slice(0, length),
    ),
  )
  for (const digest of digestsOfSource) {
    for (const source of sources) {
      assertConsumer(
        !source.includes(digest),
        `the client bundle contains "${digest}", a digest of the module's ` +
          'own source.',
      )
    }
  }

  log(
    `No source-derived digest in the client bundle (${identities.length} identities)`,
  )
}

const assertClientCarriesBuildId = (
  buildDir: string,
  expected: string,
  other: string,
): void => {
  const sources = clientBundleSources(buildDir)
  assertConsumer(
    sources.some(source => source.includes(expected)),
    `no client bundle in ${buildDir} carries the build id "${expected}", so ` +
      'the plugin never compiled it into the client entry.',
  )
  assertConsumer(
    sources.every(source => !source.includes(other)),
    `a client bundle in ${buildDir} carries the other build's id "${other}".`,
  )
  log(`Client bundle carries ${expected}`)
}

// THE SERVED PAGES

type ServerEntry = Readonly<{
  buildId?: string
  renderHtml: (template: string) => Promise<string>
  renderWithoutBuildIdTag: () => Promise<string>
}>

const loadServerEntry = async (buildDir: string): Promise<ServerEntry> => {
  const entry: ServerEntry = await import(
    pathToFileURL(join(buildDir, 'server/entry.server.js')).href
  )
  return entry
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
}

type Pages = Readonly<{
  same: string
  csp: string
  stale: string
  noFlags: string
  duplicateFlags: string
  malformedFlags: string
  incompatibleFlags: string
  modal: string
  noStamp: string
  duplicateRoots: string
  ambiguousRoots: string
  lifecycle: string
}>

// Every way a hydration can refuse once it knows which root it was going to
// adopt. Each leaves the same live page behind, so each has to leave it
// contained.
const PAGE_PATHS: Readonly<Record<string, keyof Pages | undefined>> = {
  '/same': 'same',
  '/csp': 'csp',
  '/stale': 'stale',
  '/no-flags': 'noFlags',
  '/duplicate-flags': 'duplicateFlags',
  '/malformed-flags': 'malformedFlags',
  '/incompatible-flags': 'incompatibleFlags',
  '/modal': 'modal',
  '/no-stamp': 'noStamp',
  '/duplicate-roots': 'duplicateRoots',
  '/ambiguous-roots': 'ambiguousRoots',
  '/lifecycle': 'lifecycle',
}

// An embedded document the host counts. Containment used to reparent the served
// root, which reloads every browsing context inside it, so a second request for
// this path is the reload itself rather than a proxy for one.
const FRAME_PATH = '/probe-frame'
const ADOPTED_FRAME_PATH = '/adopted-frame'

const startServer = (
  pages: Pages,
  assetRoots: Readonly<Record<string, string>>,
  requestedPaths: Array<string>,
): Promise<Server> =>
  new Promise(resolveServer => {
    const server = createServer((request, response) => {
      const path = new URL(request.url ?? '/', ORIGIN).pathname
      requestedPaths.push(path)
      if (path === FRAME_PATH || path === ADOPTED_FRAME_PATH) {
        response.writeHead(200, { 'content-type': CONTENT_TYPES['.html'] })
        response.end(
          path === ADOPTED_FRAME_PATH
            ? '<!doctype html><script>parent.__recordAdoptedFrame(document)</script><p>adopted frame</p>'
            : '<!doctype html><p>frame</p>',
        )
        return
      }
      const page = PAGE_PATHS[path]
      if (page !== undefined) {
        response.writeHead(200, {
          'content-type': CONTENT_TYPES['.html'],
          ...(path === '/csp'
            ? { 'content-security-policy': "style-src-attr 'none'" }
            : {}),
        })
        response.end(pages[page])
        return
      }
      const prefix = Object.keys(assetRoots).find(candidate =>
        path.startsWith(candidate),
      )
      const root = prefix === undefined ? undefined : assetRoots[prefix]
      if (prefix === undefined || root === undefined) {
        response.writeHead(404)
        response.end()
        return
      }
      try {
        const file = readFileSync(join(root, path.slice(prefix.length)))
        response.writeHead(200, {
          'content-type':
            CONTENT_TYPES[extname(path)] ?? 'application/octet-stream',
        })
        response.end(file)
      } catch {
        response.writeHead(404)
        response.end()
      }
    })
    server.listen(PORT, '127.0.0.1', () => resolveServer(server))
  })

// THE BROWSER

type Probe = Readonly<{
  rootIsConnected: boolean
  fieldIsSameElement: boolean
  fieldValue: string
  adoptedFrameIsSameElement: boolean
  adoptedFrameLoads: number
  adoptedFrameDocumentIsSame: boolean
  customHolderConstructions: number
  innerProbeConstructions: number
  idPropertyWrites: number
  innerHtmlPropertyWrites: number
  renderedCount: string
  rootIsContained: boolean
  shieldIsVisible: boolean
  customElementConnections: number
  reconnectModalIsOpen: boolean
  parserConnectionChildCount: number
  parserConnectionCount: number
  parserChildrenBeforeHydration: number
  parserOwnedHostIsFresh: boolean
  parserOldHostIsDisconnected: boolean
  parserViewChildIsFresh: boolean
  parserComponentChildIsDisconnected: boolean
  parserServerChildIsDisconnected: boolean
  parserLiveTitleIsRestored: boolean
  parserAncestorTitleIsRestored: boolean
  parserEarlierSiblingTitleIsRestored: boolean
  parserEarlierSiblingTextIsRestored: boolean
  parserDisconnectMutationsAreIsolated: boolean
  parserRetainedMutationIsIsolated: boolean
}>

type TopLayerProbe = Readonly<{
  shieldIsOpen: boolean
  shieldIsVisible: boolean
  shieldHasFocus: boolean
  shieldCount: number
  dialogsAreOpen: boolean
  closeEvents: number
  cancelEvents: number
  controlClicks: number
  documentInputs: number
  bodyKeyEvents: number
  fieldValues: ReadonlyArray<string>
  modalNodesAreConnected: boolean
  openShadowIdentityIsIntact: boolean
  frameIdentityIsIntact: boolean
  customElementIdentityIsIntact: boolean
  customElementConnections: number
  customElementDisconnections: number
  points: ReadonlyArray<Readonly<{ x: number; y: number }>>
}>

type ControlledDomProbe = Readonly<{
  nodeIdentityIsIntact: boolean
  observedIdChangesAtDefinition: number
  observedIdChanges: number
  observedDirection: string | null
  customHolderConstructions: number
  innerProbeConstructions: number
  idPropertyWrites: number
  innerHtmlPropertyWrites: number
  customInnerHtmlHostWasRebuilt: boolean
  customInnerHtmlWasRebuilt: boolean
  nativeInnerHtmlWasAdopted: boolean
  styleMutations: number
  value: string
  defaultValue: string
  valueAttribute: string | null
  checked: boolean
  defaultChecked: boolean
  hasCheckedAttribute: boolean
  rawSelectValue: string
  rawSelectIndex: number
  rawSelectFirstDefault: boolean
  rawSelectSecondDefault: boolean
  textareaValue: string
  textareaDefaultValue: string
  outputValue: string
  outputDefaultValue: string
  outputChild: string | null
  innerSelectValue: string
  innerSelectIndex: number
  fileType: string
  fileValue: string
  fileDefaultValue: string
  fileValueAttribute: string | null
  inputSize: number
  tabIndex: number
  title: string
  textareaCols: number
  textareaRows: number
  orderedStart: number
  styleColor: string
  customStyleValue: string
  valueAfterReset: string
  checkedAfterReset: boolean
}>

type ConsoleMessage = Readonly<{ type: () => string; text: () => string }>

type PlaywrightPage = Readonly<{
  goto: (url: string, options: { waitUntil: 'networkidle' }) => Promise<unknown>
  evaluate: <A>(body: string) => Promise<A>
  waitForFunction: (
    body: string,
    arg?: unknown,
    options?: Readonly<{ timeout?: number }>,
  ) => Promise<unknown>
  click: (
    selector: string,
    options?: { force?: boolean; timeout?: number },
  ) => Promise<unknown>
  keyboard: Readonly<{
    press: (key: string) => Promise<void>
    type: (text: string) => Promise<void>
  }>
  mouse: Readonly<{
    click: (x: number, y: number) => Promise<void>
  }>
  url: () => string
  on: (event: 'console' | 'pageerror', listener: (value: never) => void) => void
}>

type PlaywrightBrowser = Readonly<{
  newPage: () => Promise<PlaywrightPage>
  close: () => Promise<void>
}>

type PlaywrightBrowserType = Readonly<{
  launch: (options: { executablePath?: string }) => Promise<PlaywrightBrowser>
}>

type Playwright = Readonly<{
  chromium: PlaywrightBrowserType
  firefox: PlaywrightBrowserType
  webkit: PlaywrightBrowserType
}>

// Playwright is installed for the browser suites in `packages/examples-e2e`
// rather than at the root, and it is CommonJS, so it is required from that
// package rather than imported from here.
const loadPlaywright = (): Playwright => {
  const requireFromE2e = createRequire(
    join(REPO_ROOT, 'packages/examples-e2e/package.json'),
  )
  return requireFromE2e('playwright')
}

const readBrowserProgram = (path: string): string => {
  const program = readConsumerFixture({ path }).trim()
  return program.startsWith(';') ? program.slice(1) : program
}

const PROBE_SCRIPT = readBrowserProgram('probes/hydration.js')
const TOP_LAYER_PROBE_SCRIPT = readBrowserProgram('probes/top-layer.js')
const CONTROLLED_DOM_PROBE_SCRIPT = readBrowserProgram(
  'probes/controlled-dom.js',
)

const RELEASED_DOM_PROBE_SCRIPT = `(async () => {
  await Promise.resolve()
  const form = document.querySelector('#release-form')
  const beforeReset = ${CONTROLLED_DOM_PROBE_SCRIPT}
  form.reset()
  const afterReset = ${CONTROLLED_DOM_PROBE_SCRIPT}
  return {
    ...beforeReset,
    valueAfterReset: afterReset.value,
    checkedAfterReset: afterReset.checked,
  }
})()`

type PageReading = Readonly<{
  probe: Probe
  diagnostics: ReadonlyArray<string>
}>

type HydrationOutcome = 'Hydrated' | 'Refused'

const waitForHydrationOutcome = async (
  page: PlaywrightPage,
  outcome: HydrationOutcome,
): Promise<void> => {
  const completion =
    outcome === 'Hydrated'
      ? `document.querySelector('[data-foldkit-app]') === null`
      : `document.body.hasAttribute('data-foldkit-refused') && document.querySelector('[data-foldkit-refusal-shield]')?.open === true`
  await page.waitForFunction(completion, undefined, {
    timeout: DOM_COMMIT_TIMEOUT_MS,
  })
}

const readPage = async (
  browser: PlaywrightBrowser,
  path: string,
  outcome: HydrationOutcome,
): Promise<PageReading> => {
  const page = await browser.newPage()
  // Every console level, not only `error`. What matters is that an operator
  // can see why a page went inert; which console method Effect's logger reaches
  // for is its business.
  const diagnostics: Array<string> = []
  page.on('console', (message: never) => {
    const consoleMessage: ConsoleMessage = message
    diagnostics.push(`${consoleMessage.type()}: ${consoleMessage.text()}`)
  })
  page.on('pageerror', (error: never) => {
    const raised: Readonly<{ message: string }> = error
    diagnostics.push(raised.message)
  })
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
  await waitForHydrationOutcome(page, outcome)
  return { probe: await page.evaluate<Probe>(PROBE_SCRIPT), diagnostics }
}

const assertAdoptsSameBuild = (probe: Probe): void => {
  assertConsumer(
    probe.rootIsConnected,
    'hydration replaced the root of a page from its own build. Every load ' +
      'would rebuild, and the assertions below would pass for the wrong reason.',
  )
  assertConsumer(
    probe.fieldIsSameElement,
    'hydration replaced the input on a page from its own build.',
  )
  assertConsumer(
    probe.fieldValue === TYPED_VALUE,
    `hydration lost the DOM value typed before it ran (saw "${probe.fieldValue}").`,
  )
  assertConsumer(
    probe.adoptedFrameIsSameElement &&
      probe.adoptedFrameLoads === 1 &&
      probe.adoptedFrameDocumentIsSame,
    'hydration replaced or reloaded an agreeing iframe from its own build.',
  )
  assertConsumer(
    probe.customHolderConstructions === 2 &&
      probe.innerProbeConstructions === 3 &&
      probe.idPropertyWrites === 0 &&
      probe.innerHtmlPropertyWrites === 0,
    'hydration built the wrong number of custom-element hosts or raw-HTML ' +
      'children, or invoked a component setter for view-owned state: ' +
      JSON.stringify(probe),
  )
  assertConsumer(
    probe.parserConnectionChildCount === 0 &&
      probe.parserConnectionCount === 2 &&
      probe.parserChildrenBeforeHydration === 2,
    'the browser did not exercise parser-time custom-element light DOM: ' +
      JSON.stringify(probe),
  )
  assertConsumer(
    probe.parserOwnedHostIsFresh &&
      probe.parserOldHostIsDisconnected &&
      probe.parserViewChildIsFresh &&
      probe.parserComponentChildIsDisconnected &&
      probe.parserServerChildIsDisconnected &&
      probe.parserLiveTitleIsRestored &&
      probe.parserAncestorTitleIsRestored &&
      probe.parserEarlierSiblingTitleIsRestored &&
      probe.parserEarlierSiblingTextIsRestored &&
      probe.parserDisconnectMutationsAreIsolated &&
      probe.parserRetainedMutationIsIsolated,
    'hydration retained a custom-element host with view-owned light DOM, or ' +
      'allowed disconnect-time mutations to reach the replacement: ' +
      JSON.stringify(probe),
  )
  assertConsumer(
    probe.renderedCount === 'Count: 0',
    `the hydrated application did not render (saw "${probe.renderedCount}").`,
  )
  log(
    'Same build: root, input, and iframe adopted; view-owned custom-element ' +
      'host rebuilt',
  )
}

const assertProbeValues = (
  label: string,
  probe: ControlledDomProbe,
  expected: Readonly<Record<string, unknown>>,
): void => {
  for (const [name, expectedValue] of Object.entries(expected)) {
    const actual = Reflect.get(probe, name)
    assertConsumer(
      Object.is(actual, expectedValue),
      `${label}: ${name} was ${JSON.stringify(actual)}, expected ` +
        `${JSON.stringify(expectedValue)}. Full probe: ${JSON.stringify(probe)}`,
    )
  }
}

const releaseControlledDomOwnership = async (
  page: PlaywrightPage,
): Promise<void> => {
  await page.click('#release')
  await page.waitForFunction(
    `document.querySelector('#output-child')?.textContent === 'output default'`,
    undefined,
    { timeout: DOM_COMMIT_TIMEOUT_MS },
  )
}

const assertControlledDomTransitions = async (
  browser: PlaywrightBrowser,
): Promise<void> => {
  const page = await browser.newPage()
  await page.goto(`${ORIGIN}/same`, { waitUntil: 'networkidle' })
  await waitForHydrationOutcome(page, 'Hydrated')
  const controlled = await page.evaluate<ControlledDomProbe>(
    CONTROLLED_DOM_PROBE_SCRIPT,
  )
  assertProbeValues('controlled hydration', controlled, {
    nodeIdentityIsIntact: true,
    observedIdChangesAtDefinition: 2,
    observedIdChanges: 4,
    observedDirection: 'LTR',
    customHolderConstructions: 2,
    innerProbeConstructions: 3,
    idPropertyWrites: 0,
    innerHtmlPropertyWrites: 0,
    customInnerHtmlHostWasRebuilt: true,
    customInnerHtmlWasRebuilt: true,
    nativeInnerHtmlWasAdopted: true,
    styleMutations: 0,
    value: 'same',
    defaultValue: 'same',
    valueAttribute: 'same',
    checked: true,
    defaultChecked: true,
    hasCheckedAttribute: true,
    rawSelectValue: 'a',
    rawSelectIndex: 0,
    rawSelectFirstDefault: true,
    rawSelectSecondDefault: false,
    textareaValue: 'controlled',
    textareaDefaultValue: 'controlled',
    outputValue: 'controlled',
    outputDefaultValue: 'controlled',
    outputChild: null,
    innerSelectValue: 'b',
    innerSelectIndex: 1,
    fileType: 'text',
    fileValue: 'controlled',
    fileDefaultValue: 'controlled',
    fileValueAttribute: 'controlled',
    inputSize: 3,
    tabIndex: 4,
    title: 'owned',
    textareaCols: 4,
    textareaRows: 5,
    orderedStart: 6,
    styleColor: 'rgb(255, 0, 0)',
    customStyleValue: 'packed',
  })

  await releaseControlledDomOwnership(page)
  const released = await page.evaluate<ControlledDomProbe>(
    RELEASED_DOM_PROBE_SCRIPT,
  )
  assertProbeValues('released ownership', released, {
    nodeIdentityIsIntact: true,
    observedIdChangesAtDefinition: 2,
    observedIdChanges: 4,
    observedDirection: 'LTR',
    customHolderConstructions: 2,
    innerProbeConstructions: 3,
    idPropertyWrites: 0,
    innerHtmlPropertyWrites: 0,
    customInnerHtmlHostWasRebuilt: true,
    customInnerHtmlWasRebuilt: true,
    nativeInnerHtmlWasAdopted: true,
    styleMutations: 1,
    value: '',
    defaultValue: '',
    valueAttribute: null,
    checked: false,
    defaultChecked: false,
    hasCheckedAttribute: false,
    rawSelectValue: 'b',
    rawSelectIndex: 1,
    rawSelectFirstDefault: false,
    rawSelectSecondDefault: true,
    textareaValue: 'textarea default',
    textareaDefaultValue: 'textarea default',
    outputValue: 'output default',
    outputDefaultValue: 'output default',
    outputChild: 'output default',
    innerSelectValue: 'a',
    innerSelectIndex: 0,
    fileType: 'file',
    fileValue: '',
    fileDefaultValue: 'default-file-name',
    fileValueAttribute: 'default-file-name',
    inputSize: 20,
    tabIndex: -1,
    title: '',
    textareaCols: 20,
    textareaRows: 2,
    orderedStart: 1,
    styleColor: 'rgb(0, 0, 255)',
    customStyleValue: 'packed',
    valueAfterReset: '',
    checkedAfterReset: false,
  })

  const cspPage = await browser.newPage()
  await cspPage.goto(`${ORIGIN}/csp`, { waitUntil: 'networkidle' })
  const cspBefore = await cspPage.evaluate<ControlledDomProbe>(
    CONTROLLED_DOM_PROBE_SCRIPT,
  )
  assertProbeValues('strict CSP hydration', cspBefore, {
    nodeIdentityIsIntact: true,
    observedIdChanges: 4,
    observedDirection: 'LTR',
    customHolderConstructions: 2,
    innerProbeConstructions: 3,
    idPropertyWrites: 0,
    innerHtmlPropertyWrites: 0,
    customInnerHtmlHostWasRebuilt: true,
    customInnerHtmlWasRebuilt: true,
    nativeInnerHtmlWasAdopted: true,
    styleMutations: 2,
    styleColor: 'rgb(255, 0, 0)',
    customStyleValue: 'packed',
  })
  await releaseControlledDomOwnership(cspPage)
  const cspReleased = await cspPage.evaluate<ControlledDomProbe>(
    RELEASED_DOM_PROBE_SCRIPT,
  )
  assertProbeValues('strict CSP style update', cspReleased, {
    nodeIdentityIsIntact: true,
    observedIdChanges: 4,
    observedDirection: 'LTR',
    customHolderConstructions: 2,
    innerProbeConstructions: 3,
    idPropertyWrites: 0,
    innerHtmlPropertyWrites: 0,
    customInnerHtmlHostWasRebuilt: true,
    customInnerHtmlWasRebuilt: true,
    nativeInnerHtmlWasAdopted: true,
    styleMutations: 3,
    styleColor: 'rgb(0, 0, 255)',
    customStyleValue: 'packed',
  })
  log(
    'Packed Chromium: hydration, ownership release, reset, custom-element, ' +
      'style mutation, and strict CSP behavior agree',
  )
}

const assertRefusesOtherBuild = (reading: PageReading): void => {
  // The policy for a page from another deployment is to stop before reading
  // anything it carries, so the served DOM is left exactly as it arrived and no
  // code from this build ever owns it. What must be true is that this build
  // took nothing from the page: it did not adopt the root, and it did not
  // render over it.
  assertConsumer(
    reading.diagnostics.some(message =>
      message.includes('this client belongs to deployment'),
    ),
    'a page served by another deployment produced no build mismatch ' +
      `diagnostic. Saw: ${JSON.stringify(reading.diagnostics)}`,
  )
  assertConsumer(
    reading.probe.rootIsConnected && reading.probe.fieldIsSameElement,
    'the served DOM was replaced on a page from another deployment. Startup ' +
      'is supposed to stop before it reads the handoff at all, which leaves ' +
      'the served markup untouched.',
  )
  assertConsumer(
    reading.probe.renderedCount === 'Count: 0',
    'the application rendered over a page from another deployment ' +
      `(saw "${reading.probe.renderedCount}").`,
  )
  assertConsumer(
    reading.probe.rootIsContained,
    'the refused root is still interactive. Its links navigate and its forms ' +
      'submit to whatever the deployment that served it wrote, with none of ' +
      'that deployment’s code running to reconsider.',
  )
  log('Other build: refused before adoption, served DOM left untouched')
}

// What a refused page must not do on its own. The button is the weak case: no
// Foldkit listener was ever attached to it, so a click proving nothing happens
// proves only that Foldkit did not start. The link, the form, and focus are
// browser behavior that needs no listener at all, and they are what would
// otherwise act on a page whose deployment is gone.
const assertPageIsInert = async (
  browser: PlaywrightBrowser,
  path: string,
  requestedPaths: ReadonlyArray<string>,
): Promise<void> => {
  const page = await browser.newPage()
  await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' })
  await waitForHydrationOutcome(page, 'Refused')
  const before = requestedPaths.length

  await page.click('#increment', { force: true, timeout: 2_000 })
  await page.click('#native-link', { force: true, timeout: 2_000 })
  await page.click('#native-submit', { force: true, timeout: 2_000 })
  await page.evaluate(
    `(() => {
      const field = document.querySelector('#field')
      if (field !== null) {
        field.focus()
      }
      return null
    })()`,
  )

  const after = await page.evaluate<Probe>(PROBE_SCRIPT)
  const focused = await page.evaluate<string>(
    `(() => document.activeElement === null ? '<none>' : document.activeElement.id)()`,
  )

  assertConsumer(
    after.renderedCount === 'Count: 0',
    'a page from another deployment responded to input, so this build was ' +
      `driving it after all (saw "${after.renderedCount}").`,
  )
  assertConsumer(
    page.url() === `${ORIGIN}${path}`,
    `a click navigated a refused page to ${page.url()}.`,
  )
  assertConsumer(
    String(focused) !== 'field',
    'a control inside a refused page took focus.',
  )
  const newRequests = requestedPaths.slice(before)
  assertConsumer(
    newRequests.length === 0,
    `a refused page sent the host ${JSON.stringify(newRequests)}.`,
  )
  log(`${path}: inert to links, forms, and focus`)
}

const assertTopLayerIsContained = async (
  browser: PlaywrightBrowser,
  requestedPaths: ReadonlyArray<string>,
): Promise<void> => {
  const page = await browser.newPage()
  await page.goto(`${ORIGIN}/modal`, { waitUntil: 'networkidle' })
  await waitForHydrationOutcome(page, 'Refused')
  const requestsBeforeInteraction = requestedPaths.length
  const before = await page.evaluate<TopLayerProbe>(TOP_LAYER_PROBE_SCRIPT)

  assertConsumer(
    before.shieldIsOpen &&
      before.shieldIsVisible &&
      before.shieldHasFocus &&
      before.shieldCount === 1,
    'the refusal shield is not one visible, focused active modal above the ' +
      'served page.',
  )
  assertConsumer(
    before.dialogsAreOpen &&
      before.closeEvents === 0 &&
      before.cancelEvents === 0,
    'containment changed an author-owned dialog or invoked its close/cancel ' +
      `lifecycle (${String(before.closeEvents)} close, ` +
      `${String(before.cancelEvents)} cancel).`,
  )
  assertConsumer(
    before.modalNodesAreConnected && before.openShadowIdentityIsIntact,
    'containment moved or replaced modal content in a light, open-shadow, or ' +
      'closed-shadow tree.',
  )
  assertConsumer(
    before.frameIdentityIsIntact &&
      before.customElementIdentityIsIntact &&
      before.customElementConnections === 1 &&
      before.customElementDisconnections === 0,
    'containment changed an embedded document or custom-element lifecycle.',
  )

  await page.keyboard.press('Escape')
  await page.keyboard.press('Space')
  await page.keyboard.press('Enter')
  for (const point of before.points) {
    await page.mouse.click(point.x, point.y)
  }
  await page.evaluate(
    `(() => {
      const probe = window.__topLayerProbe
      for (const field of probe.fields) {
        field.focus()
      }
      return null
    })()`,
  )
  await page.keyboard.type('stale input')
  await page.keyboard.press('Tab')

  const after = await page.evaluate<TopLayerProbe>(TOP_LAYER_PROBE_SCRIPT)
  assertConsumer(
    after.shieldIsOpen && after.shieldIsVisible && after.shieldCount === 1,
    'Escape, backdrop input, or focus traversal dismissed the refusal shield: ' +
      JSON.stringify(after),
  )
  assertConsumer(
    after.dialogsAreOpen && after.closeEvents === 0,
    'an interaction with the refusal shield closed an author-owned dialog: ' +
      JSON.stringify(after),
  )
  assertConsumer(
    after.controlClicks === 0,
    'the refusal shield let a native target or bubble handler on served ' +
      `content run (${String(after.controlClicks)} interactions).`,
  )
  assertConsumer(
    after.bodyKeyEvents === 0,
    'keyboard input escaped the refusal shield and reached a stale body ' +
      `handler (${String(after.bodyKeyEvents)} events).`,
  )
  assertConsumer(
    after.fieldValues.every(value => value === ''),
    'keyboard input changed a stale same-document field: ' +
      JSON.stringify(after.fieldValues),
  )
  assertConsumer(
    page.url() === `${ORIGIN}/modal`,
    `top-layer interaction navigated a refused page to ${page.url()}.`,
  )
  const newRequests = requestedPaths.slice(requestsBeforeInteraction)
  assertConsumer(
    newRequests.length === 0,
    `top-layer interaction sent the host ${JSON.stringify(newRequests)}.`,
  )
  assertConsumer(
    after.modalNodesAreConnected &&
      after.openShadowIdentityIsIntact &&
      after.frameIdentityIsIntact &&
      after.customElementIdentityIsIntact &&
      after.customElementConnections === 1 &&
      after.customElementDisconnections === 0,
    'interacting with containment moved, replaced, reconnected, or reloaded ' +
      'served DOM.',
  )
  log(
    '/modal: light/open/closed-shadow top layers covered without lifecycle ' +
      'or native interaction',
  )
}

const assertLifecycleIsContained = async (
  browser: PlaywrightBrowser,
  requestedPaths: ReadonlyArray<string>,
): Promise<void> => {
  const framesBefore = requestedPaths.filter(path => path === FRAME_PATH).length
  const lifecycleReading = await readPage(browser, '/lifecycle', 'Refused')
  const framesAfter = requestedPaths.filter(path => path === FRAME_PATH).length
  assertConsumer(
    lifecycleReading.probe.rootIsContained,
    '/lifecycle left its page interactive.',
  )
  assertConsumer(
    lifecycleReading.probe.customElementConnections === 1,
    'containment reconnected an upgraded custom element ' +
      `(${String(lifecycleReading.probe.customElementConnections)} ` +
      'connections). Reparenting the served root disconnects and reconnects ' +
      'everything inside it.',
  )
  assertConsumer(
    framesAfter - framesBefore === 1,
    `containment reloaded an embedded document (${String(framesAfter - framesBefore)} ` +
      'requests for the frame, expected 1). Moving the root reloads every ' +
      'browsing context inside it.',
  )
  assertConsumer(
    lifecycleReading.probe.reconnectModalIsOpen === false,
    'a custom element opened a modal from a second connection, which reaches ' +
      'the top layer above an earlier refusal shield.',
  )
  assertConsumer(
    lifecycleReading.probe.shieldIsVisible,
    'the refusal shield was not visibly covering served content.',
  )
  await assertPageIsInert(browser, '/lifecycle', requestedPaths)
  log('/lifecycle: nothing reconnected, reloaded, or took focus')
}

const assertCriticalSameBuild = (browserName: string, probe: Probe): void => {
  assertConsumer(
    probe.rootIsConnected && probe.fieldIsSameElement,
    `${browserName}: agreeing hydration replaced the root or input.`,
  )
  assertConsumer(
    probe.fieldValue === TYPED_VALUE,
    `${browserName}: agreeing hydration lost the value typed before startup.`,
  )
  assertConsumer(
    probe.adoptedFrameIsSameElement &&
      probe.adoptedFrameLoads === 1 &&
      probe.adoptedFrameDocumentIsSame,
    `${browserName}: agreeing hydration replaced or reloaded its iframe.`,
  )
  assertConsumer(
    probe.parserOwnedHostIsFresh &&
      probe.parserOldHostIsDisconnected &&
      probe.parserViewChildIsFresh &&
      probe.parserComponentChildIsDisconnected &&
      probe.parserServerChildIsDisconnected &&
      probe.parserLiveTitleIsRestored &&
      probe.parserAncestorTitleIsRestored &&
      probe.parserEarlierSiblingTitleIsRestored &&
      probe.parserEarlierSiblingTextIsRestored &&
      probe.parserDisconnectMutationsAreIsolated &&
      probe.parserRetainedMutationIsIsolated,
    `${browserName}: a view-owned Custom Element was not rebuilt cleanly ` +
      `during hydration: ${JSON.stringify(probe)}`,
  )
  assertConsumer(
    probe.renderedCount === 'Count: 0' && !probe.rootIsContained,
    `${browserName}: agreeing hydration did not start cleanly.`,
  )
}

const assertCriticalControlledDomTransitions = async (
  browserName: string,
  browser: PlaywrightBrowser,
): Promise<void> => {
  const page = await browser.newPage()
  await page.goto(`${ORIGIN}/same`, { waitUntil: 'networkidle' })
  await waitForHydrationOutcome(page, 'Hydrated')
  const controlled = await page.evaluate<ControlledDomProbe>(
    CONTROLLED_DOM_PROBE_SCRIPT,
  )
  assertProbeValues(`${browserName} controlled hydration`, controlled, {
    nodeIdentityIsIntact: true,
    customInnerHtmlHostWasRebuilt: true,
    customInnerHtmlWasRebuilt: true,
    nativeInnerHtmlWasAdopted: true,
    value: 'same',
    defaultValue: 'same',
    valueAttribute: 'same',
    checked: true,
    defaultChecked: true,
    hasCheckedAttribute: true,
    rawSelectValue: 'a',
    rawSelectIndex: 0,
    rawSelectFirstDefault: true,
    rawSelectSecondDefault: false,
    textareaValue: 'controlled',
    textareaDefaultValue: 'controlled',
    innerSelectValue: 'b',
    innerSelectIndex: 1,
  })

  await releaseControlledDomOwnership(page)
  const released = await page.evaluate<ControlledDomProbe>(
    RELEASED_DOM_PROBE_SCRIPT,
  )
  assertProbeValues(`${browserName} released ownership`, released, {
    nodeIdentityIsIntact: true,
    customInnerHtmlHostWasRebuilt: true,
    customInnerHtmlWasRebuilt: true,
    nativeInnerHtmlWasAdopted: true,
    value: '',
    defaultValue: '',
    valueAttribute: null,
    checked: false,
    defaultChecked: false,
    hasCheckedAttribute: false,
    rawSelectValue: 'b',
    rawSelectIndex: 1,
    rawSelectFirstDefault: false,
    rawSelectSecondDefault: true,
    textareaValue: 'textarea default',
    textareaDefaultValue: 'textarea default',
    innerSelectValue: 'a',
    innerSelectIndex: 0,
    valueAfterReset: '',
    checkedAfterReset: false,
  })
}

const runCriticalBrowserChecks = async (
  browserName: string,
  browserType: PlaywrightBrowserType,
  requestedPaths: ReadonlyArray<string>,
): Promise<void> => {
  log(`Running the critical server-rendering checks in ${browserName}...`)
  const browser = await browserType.launch({})
  try {
    const adoptedFramesBefore = requestedPaths.filter(
      path => path === ADOPTED_FRAME_PATH,
    ).length
    const sameReading = await readPage(browser, '/same', 'Hydrated')
    const adoptedFramesAfter = requestedPaths.filter(
      path => path === ADOPTED_FRAME_PATH,
    ).length
    assertConsumer(
      adoptedFramesAfter - adoptedFramesBefore === 1,
      `${browserName}: agreeing hydration requested its iframe ` +
        `${String(adoptedFramesAfter - adoptedFramesBefore)} times.`,
    )
    assertCriticalSameBuild(browserName, sameReading.probe)
    await assertCriticalControlledDomTransitions(browserName, browser)

    const staleReading = await readPage(browser, '/stale', 'Refused')
    assertRefusesOtherBuild(staleReading)
    await assertPageIsInert(browser, '/stale', requestedPaths)
    await assertTopLayerIsContained(browser, requestedPaths)
    await assertLifecycleIsContained(browser, requestedPaths)
  } finally {
    await browser.close()
  }
  log(`${browserName}: critical server-rendering checks agree`)
}

const runCriticalBrowserMatrix = async (
  playwright: Playwright,
  requestedPaths: ReadonlyArray<string>,
): Promise<void> => {
  for (const [browserName, browserType] of Object.entries({
    Firefox: playwright.firefox,
    WebKit: playwright.webkit,
  })) {
    await runCriticalBrowserChecks(browserName, browserType, requestedPaths)
  }
}

// DRIVER

const withTempDir = async (
  prefix: string,
  useTempDir: (tempDir: string) => Promise<void>,
): Promise<void> => {
  const tempDir = mkdtempSync(join(tmpdir(), prefix))
  log(`Consumer project: ${tempDir}`)
  try {
    await useTempDir(tempDir)
  } finally {
    log('Cleaning up the consumer project...')
    rmSync(tempDir, { recursive: true, force: true })
  }
}

const main = async (): Promise<void> => {
  const tarballPaths: Array<string> = []
  try {
    if (!isSkipBuild) {
      runRequired(
        'Building foldkit and @foldkit/vite-plugin...',
        'pnpm',
        ['--filter', 'foldkit', '--filter', '@foldkit/vite-plugin', 'build'],
        { inherit: true },
      )
    }

    const foldkitTarball = packPackage('Packing foldkit...', FOLDKIT_DIR)
    tarballPaths.push(foldkitTarball)
    const pluginTarball = packPackage(
      'Packing @foldkit/vite-plugin...',
      PLUGIN_DIR,
    )
    tarballPaths.push(pluginTarball)

    await withTempDir('foldkit-packed-ssr-', async projectDir => {
      writeConsumerProject(projectDir, foldkitTarball, pluginTarball)

      // NOTE: the plugin's `foldkit` peer floor names the first release that
      // ships the server export, which the packed workspace copy only reaches
      // once `changeset version` has run. `check-peer-floors.ts` asserts that
      // floor against the packed manifest; relaxing it here keeps this gate
      // about externalization rather than about release ordering.
      runRequired(
        'Installing the packed tarballs outside the monorepo...',
        'npm',
        ['install', '--no-audit', '--no-fund', '--legacy-peer-deps'],
        { cwd: projectDir, inherit: true },
      )

      runRequired(
        'Checking the packed direct entrypoints...',
        'node',
        ['scripts/entrypoints.mjs'],
        { cwd: projectDir },
      )

      const servedDir = join(projectDir, 'build-served')
      const currentDir = join(projectDir, 'build-current')

      runRequired(
        `Building the deployment that served the page (${BUILD_ID_SERVED})...`,
        'npm',
        ['run', 'build', '--', 'build-served', '/served/'],
        {
          cwd: projectDir,
          env: { FOLDKIT_BUILD_ID: BUILD_ID_SERVED },
          inherit: true,
        },
      )
      runRequired(
        `Building the deployment now live (${BUILD_ID_CURRENT})...`,
        'npm',
        ['run', 'build', '--', 'build-current', '/current/'],
        {
          cwd: projectDir,
          env: { FOLDKIT_BUILD_ID: BUILD_ID_CURRENT },
          inherit: true,
        },
      )

      assertServerBundleExternalizesFoldkit(servedDir)
      assertServerBundleExternalizesFoldkit(currentDir)
      assertPackedTypesResolve(projectDir)
      assertNoSourceOracle(servedDir)
      assertClientCarriesBuildId(servedDir, BUILD_ID_SERVED, BUILD_ID_CURRENT)
      assertClientCarriesBuildId(currentDir, BUILD_ID_CURRENT, BUILD_ID_SERVED)

      const servedEntry = await loadServerEntry(servedDir)
      assertConsumer(
        servedEntry.buildId === BUILD_ID_SERVED,
        `the server bundle carries build id "${String(servedEntry.buildId)}", ` +
          `not "${BUILD_ID_SERVED}". An externalized Foldkit never sees the ` +
          'define, so the entry must read it and pass it explicitly.',
      )

      const templateOf = (buildDir: string): string =>
        readFileSync(join(buildDir, 'client/index.html'), 'utf8')

      // The page a visitor already had open: rendered and stamped by the
      // deployment that served it, then met by the client bundle of the
      // deployment now live. The template it is injected into is the live one,
      // so its script tag loads the live client.
      const same = await servedEntry.renderHtml(templateOf(servedDir))
      const csp = same
      const stale = await servedEntry.renderHtml(templateOf(currentDir))

      // The same page, damaged in each of the ways a handoff can fail. The
      // build id still matches, so what refuses is the handoff itself.
      const payloadScript =
        /<script type="application\/json" data-foldkit-flags="app">([^<]*)<\/script>/
      const flagsPayload = payloadScript.exec(same)?.[0] ?? ''
      assertConsumer(
        flagsPayload !== '',
        'the served page carries no Flags payload, so the handoff-failure ' +
          'pages below would not be testing anything.',
      )
      const noFlags = same.replace(flagsPayload, '')
      const duplicateFlags = same.replace(
        flagsPayload,
        `${flagsPayload}${flagsPayload}`,
      )
      const malformedFlags = same.replace(
        payloadScript,
        '<script type="application/json" data-foldkit-flags="app">{not json</script>',
      )
      const incompatibleFlags = same.replace(
        payloadScript,
        '<script type="application/json" data-foldkit-flags="app">{"unrelated":"shape"}</script>',
      )
      // Three author-owned modals cover the reachable tree, an open shadow
      // root, and a closed shadow root. Their close listeners reproduce the
      // failure mode where sweeping dialogs runs stale author code that reopens
      // a modal and takes focus after containment. The actions cover native
      // navigation and form submission plus an authored network request.
      const modalBody = readConsumerFixture({
        path: 'pages/modal-body.html',
        values: { FRAME_PATH },
      }).trim()
      const modalScript = readBrowserProgram('pages/modal-script.js')
      const modal = stale.replace(
        '</main>',
        `${modalBody}</main><script>${modalScript}</script>`,
      )

      // A root that lost its stamp. The generated client resolves its container
      // with `document.getElementById('root')`, and template injection has
      // already put the render where that placeholder was, so neither handle
      // survives and the failure lands while the container is resolved, before
      // `Runtime.hydrate` is reached at all.
      const noStamp = same.replace(` data-foldkit-app="app"`, '')

      // One runtime id claimed twice, and two roots with no container to choose
      // between them. Both are refused while the container is resolved.
      const appRoot = /<main [^>]*id="app-root"[^>]*>[\s\S]*?<\/main>/
      const rootMarkup = appRoot.exec(same)?.[0] ?? ''
      assertConsumer(
        rootMarkup !== '',
        'the served page has no application root to duplicate, so the ' +
          'duplicate-root pages below would not be testing anything.',
      )
      const duplicateRoots = same.replace(
        rootMarkup,
        `${rootMarkup}${rootMarkup}`,
      )
      const ambiguousRoots = same.replace(
        rootMarkup,
        `${rootMarkup}${rootMarkup.replace('data-foldkit-app="app"', 'data-foldkit-app="other"')}`,
      )

      // What containment must not do to the page it marks. The custom element
      // records every connection, and the frame's document is counted by the
      // host: reparenting the root runs `disconnectedCallback` and
      // `connectedCallback` again and reloads the frame, and the second
      // connection here opens a modal after containment has already run.
      const lifecycleBody = readConsumerFixture({
        path: 'pages/lifecycle-body.html',
        values: { FRAME_PATH },
      }).trim()
      const lifecycleScript = readBrowserProgram('pages/lifecycle-script.js')
      const lifecycle = stale.replace(
        '</main>',
        `${lifecycleBody}</main><script>${lifecycleScript}</script>`,
      )

      for (const [label, page] of Object.entries({ same, stale })) {
        assertConsumer(
          page.includes(`data-foldkit-build="${BUILD_ID_SERVED}"`),
          `the ${label} page does not carry the served build id on its root.`,
        )
      }
      log(`Served root carries data-foldkit-build="${BUILD_ID_SERVED}"`)

      const missingBuildIdTag = await servedEntry.renderWithoutBuildIdTag()
      assertConsumer(
        missingBuildIdTag === 'MissingBuildId',
        'a hydratable render with no build id produced ' +
          `"${missingBuildIdTag}" rather than the typed MissingBuildId failure.`,
      )
      log('A hydratable render with no build id fails with MissingBuildId')

      const requestedPaths: Array<string> = []
      const server = await startServer(
        {
          same,
          csp,
          stale,
          noFlags,
          duplicateFlags,
          malformedFlags,
          incompatibleFlags,
          modal,
          noStamp,
          duplicateRoots,
          ambiguousRoots,
          lifecycle,
        },
        {
          '/served/': join(servedDir, 'client'),
          '/current/': join(currentDir, 'client'),
        },
        requestedPaths,
      )
      const playwright = loadPlaywright()
      try {
        const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
        const browser = await playwright.chromium.launch(
          executablePath === undefined ? {} : { executablePath },
        )
        try {
          const adoptedFramesBefore = requestedPaths.filter(
            path => path === ADOPTED_FRAME_PATH,
          ).length
          const sameReading = await readPage(browser, '/same', 'Hydrated')
          const adoptedFramesAfter = requestedPaths.filter(
            path => path === ADOPTED_FRAME_PATH,
          ).length
          assertConsumer(
            adoptedFramesAfter - adoptedFramesBefore === 1,
            `agreeing hydration requested its iframe ${String(adoptedFramesAfter - adoptedFramesBefore)} ` +
              'times instead of once.',
          )
          assertAdoptsSameBuild(sameReading.probe)
          assertConsumer(
            !sameReading.probe.rootIsContained,
            'a page from this build was contained. Containment is for a handoff ' +
              'this client refuses, and firing it on a good page would take a ' +
              'working application out of reach.',
          )
          await assertControlledDomTransitions(browser)
          assertRefusesOtherBuild(await readPage(browser, '/stale', 'Refused'))
          await assertPageIsInert(browser, '/stale', requestedPaths)

          for (const [path, expected] of [
            ['/no-flags', 'server Flags payload is missing'],
            ['/duplicate-flags', 'multiple server Flags payloads'],
            ['/malformed-flags', 'could not decode the server'],
            ['/incompatible-flags', 'could not decode the server'],
          ]) {
            const reading = await readPage(browser, String(path), 'Refused')
            assertConsumer(
              reading.diagnostics.some(message =>
                message.includes(String(expected)),
              ),
              `${String(path)} produced no "${String(expected)}" diagnostic. ` +
                `Saw: ${JSON.stringify(reading.diagnostics)}`,
            )
            assertConsumer(
              reading.probe.rootIsContained,
              `${String(path)} left its root interactive. A handoff that cannot ` +
                'be read leaves the same live page behind that build skew does.',
            )
            await assertPageIsInert(browser, String(path), requestedPaths)
            log(`${String(path)}: refused and contained`)
          }

          const modalFramesBefore = requestedPaths.filter(
            path => path === FRAME_PATH,
          ).length
          await assertTopLayerIsContained(browser, requestedPaths)
          const modalFramesAfter = requestedPaths.filter(
            path => path === FRAME_PATH,
          ).length
          assertConsumer(
            modalFramesAfter - modalFramesBefore === 1,
            `containment reloaded the modal probe frame (${String(modalFramesAfter - modalFramesBefore)} ` +
              'requests, expected 1).',
          )

          // Refusals that land while the container is being resolved, before
          // `Runtime.hydrate` runs. The generated client has no handle to the root
          // in any of them, and the page it leaves behind is as live as any other.
          for (const [path, expected] of [
            ['/no-stamp', 'Container is null'],
            ['/duplicate-roots', 'more than one server-rendered root stamped'],
            ['/ambiguous-roots', 'more than one page-owning application'],
          ]) {
            const reading = await readPage(browser, String(path), 'Refused')
            assertConsumer(
              reading.diagnostics.some(message =>
                message.includes(String(expected)),
              ),
              `${String(path)} produced no "${String(expected)}" diagnostic. ` +
                `Saw: ${JSON.stringify(reading.diagnostics)}`,
            )
            assertConsumer(
              reading.probe.rootIsContained,
              `${String(path)} left its page interactive. A refusal that lands ` +
                'before hydration leaves the same live markup behind as one that ' +
                'lands after it.',
            )
            await assertPageIsInert(browser, String(path), requestedPaths)
            log(`${String(path)}: refused and contained`)
          }

          await assertLifecycleIsContained(browser, requestedPaths)
        } finally {
          await browser.close()
        }

        if (isCriticalBrowserMatrix) {
          await runCriticalBrowserMatrix(playwright, requestedPaths)
        }
      } finally {
        server.close()
      }
    })
  } finally {
    for (const path of tarballPaths) {
      rmSync(path, { force: true })
    }
  }

  log('PASS')
}

const messageFor = (error: unknown): string => {
  if (error instanceof ConsumerCheckError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}

main().catch((error: unknown) => {
  console.error(`[packed-ssr] FAIL: ${messageFor(error)}`)
  process.exit(1)
})
