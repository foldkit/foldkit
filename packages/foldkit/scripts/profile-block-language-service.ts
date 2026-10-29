import { Array as EffectArray, Option, Predicate, String } from 'effect'
import { execFile, execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  globSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs, promisify } from 'node:util'

import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from '../node_modules/typescript/vendor/vscode-jsonrpc/lib/node/main.js'

type Response = Readonly<{
  result: unknown
  latencyMs: number
}>

type SourceDocument = {
  readonly uri: string
  readonly originalText: string
  version: number
  text: string
}

type Position = Readonly<{ line: number; character: number }>

type RequestTargetBase = Readonly<{
  source: SourceDocument
  position: Position
}>

type RequestTargetConfig =
  | Readonly<{
      method: 'textDocument/hover'
      expectedBinding?: Readonly<{
        name: string
        owner: string
        typeNames?: ReadonlyArray<string>
        requireSchemaHeader?: boolean
        schemaHeaderFragments?: ReadonlyArray<string>
        namedBoundaryFragments?: ReadonlyArray<string>
      }>
    }>
  | Readonly<{ method: 'textDocument/definition' }>
  | Readonly<{
      method: 'textDocument/completion'
      expectedLabels: readonly [string, ...Array<string>]
    }>

type RequestTarget = RequestTargetBase & RequestTargetConfig

type Measurement = Readonly<{
  label: string
  latencyMs: number
  resultCount: number | undefined
  resultBytes: number
  resultSha256: string
  documentVersion?: number
  sourceSha256?: string
  diagnosticEvidence?: Readonly<{
    expected: 'Clean' | 'RouteError' | 'TitleError'
    errorCount: number
    code?: number
    range?: Readonly<{ start: Position; end: Position }>
  }>
}>

type ServerInfo = Readonly<{
  name: string
  version: string
}>

type ScenarioResult = Readonly<{
  serverInfo: ServerInfo
  measurements: ReadonlyArray<Measurement>
  serverMemory?: ServerMemory
}>

type ServerMemory = Readonly<{
  scenario: string
  method: 'ps -o rss= -p <pid>'
  unit: 'KiB'
  samplingIntervalMs: number
  peakRssKiB: number
  samples: ReadonlyArray<ServerMemorySample>
}>

type ServerMemorySample = Readonly<{
  phase: 'Startup' | 'Interval' | 'Final'
  elapsedMs: number
  rssKiB: number
}>

type Options = Readonly<{
  runs: number
  timeoutMs: number
  scenario: 'all' | 'message-constructors' | 'workspace'
}>

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = resolve(packageRoot, '../..')
const benchmarkScriptPath = fileURLToPath(import.meta.url)
const definitionPath = 'packages/website/src/definition.ts'
const compositionPath = 'packages/website/src/composition/composition.ts'
const changedUrlPath = 'packages/website/src/update/handleChangedUrl.ts'
const workspaceCompositionPath = 'examples/workspace/src/composition.ts'
const workspaceInitializationPath =
  'examples/workspace/src/update/initChildrenStep.ts'
const workspaceUpdatePath = Option.getOrElse(
  EffectArray.findFirst(
    [
      workspaceInitializationPath,
      'examples/workspace/src/update/initChildBlocksStep.ts',
      'examples/workspace/src/update/initializeRouteChildren.ts',
      'examples/workspace/src/update/initializeActiveChildren.ts',
    ],
    path => existsSync(resolve(workspaceRoot, path)),
  ),
  () => 'examples/workspace/src/update.ts',
)
const workspaceEntryPath = 'examples/workspace/src/entry.ts'
const workspaceDetailUpdatePath = 'examples/workspace/src/issueDetail/update.ts'
const workspaceBindingProbe = '\nIssueDetailBinding.init\n'
const workspaceBlockAccess = 'ApplicationBlock.Message.ClickedLink'
const workspaceTitleWriter = 'title: () => value'
const workspaceInvalidTitle = 'value.length'
const serverMemorySamplingIntervalMs = 250
const serverMemorySampleTimeoutMs = 1_000
const runProcess = promisify(execFile)
const bindingCall = 'SearchBinding.informRouteChanged()'
export const searchBindingHover = {
  name: 'SearchBinding',
  owner: 'Search',
  typeNames: ['InitializedBinding', 'BindingEvidence'],
  requireSchemaHeader: true,
  schemaHeaderFragments: [
    'InitializedBinding<GeneratedDirectBindingReturn<AssemblyWithView<Struct<{',
    'readonly query: String;',
    'readonly searchState: TaggedUnion<',
    'readonly activeResultIndex: Number;',
  ],
  namedBoundaryFragments: [
    'BindingEvidence<AssemblyWithView<Struct<{',
    'readonly query: String;',
    'readonly searchState: TaggedUnion<',
    'readonly activeResultIndex: Number;',
    ', false> &',
  ],
}
export const workspaceBindingHover = {
  name: 'IssueDetailBinding',
  owner: 'IssueDetail',
  typeNames: ['Block.BindingWithoutOutMessagePolicy'],
  schemaHeaderFragments: [
    'AssemblyWithViewAndOutMessage<Struct<{',
    'readonly issueId: String;',
    'readonly baseline: Struct<{',
    'readonly draft: Struct<{',
  ],
  namedBoundaryFragments: ['IssueDetailBlock', 'readonly route: RouteUnion<{'],
}
const routeWriter = 'route: () => nextRoute'
const routeErrorCode = 2322
const errorSeverity = 1
const typescriptManifestPath = join(
  packageRoot,
  'node_modules',
  'typescript',
  'package.json',
)
const nativeCompilerPackage = `@typescript/typescript-${process.platform}-${process.arch}`
const workloadGitPaths = [
  ':(glob)packages/website/**/*.ts',
  ':(glob)packages/website/**/*.tsx',
  ':(glob)packages/website/**/*.mts',
  ':(glob)packages/website/**/*.cts',
  ':(glob)packages/**/src/**/*.ts',
  ':(glob)packages/**/src/**/*.tsx',
  ':(glob)packages/**/src/**/*.mts',
  ':(glob)packages/**/src/**/*.cts',
  ':(glob)internal/**/src/**/*.ts',
  ':(glob)internal/**/src/**/*.tsx',
  ':(glob)internal/**/src/**/*.mts',
  ':(glob)internal/**/src/**/*.cts',
  ':(glob)packages/**/*.d.ts',
  ':(glob)packages/**/*.d.mts',
  ':(glob)packages/**/*.d.cts',
  ':(glob)packages/**/*.d.ts.map',
  ':(glob)packages/**/*.d.mts.map',
  ':(glob)packages/**/*.d.cts.map',
  ':(glob)internal/**/*.d.ts',
  ':(glob)internal/**/*.d.mts',
  ':(glob)internal/**/*.d.cts',
  ':(glob)internal/**/*.d.ts.map',
  ':(glob)internal/**/*.d.mts.map',
  ':(glob)internal/**/*.d.cts.map',
  ':(glob)packages/**/package.json',
  ':(glob)internal/**/package.json',
  'package.json',
  'packages/website/tsconfig.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
]
const workspaceExampleGitPaths = [
  ':(glob)examples/workspace/**/*.ts',
  ':(glob)examples/workspace/**/*.tsx',
  ':(glob)examples/workspace/**/*.mts',
  ':(glob)examples/workspace/**/*.cts',
  'examples/workspace/package.json',
  'examples/workspace/tsconfig.json',
]

const fail = (message: string): never => {
  throw new Error(message)
}

const nativeCompilerExecutable = (): string => {
  try {
    const requireFromTypescript = createRequire(
      realpathSync(typescriptManifestPath),
    )
    const nativeCompilerManifestPath = requireFromTypescript.resolve(
      `${nativeCompilerPackage}/package.json`,
    )
    const executable = join(
      dirname(nativeCompilerManifestPath),
      'lib',
      process.platform === 'win32' ? 'tsc.exe' : 'tsc',
    )
    return existsSync(executable)
      ? executable
      : fail(`Pinned native TypeScript executable is missing.`)
  } catch {
    return fail(
      `Install the pinned native TypeScript compiler before profiling.`,
    )
  }
}

const parsePositiveInteger = (value: string, option: string): number => {
  const parsed = globalThis.Number(value)

  if (!globalThis.Number.isSafeInteger(parsed) || parsed < 1) {
    return fail(`${option} requires a positive integer, received ${value}.`)
  }

  return parsed
}

const parseOptions = (): Options => {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', default: false },
      runs: { type: 'string', default: '3' },
      'timeout-ms': { type: 'string', default: '60000' },
      scenario: { type: 'string', default: 'all' },
    },
  })
  if (values.help) {
    process.stdout.write(
      'Usage: node packages/foldkit/scripts/profile-block-language-service.ts [--runs N] [--timeout-ms N] [--scenario all|message-constructors|workspace]\n',
    )
    process.exit(0)
  }

  const scenario = values.scenario
  if (
    scenario !== 'all' &&
    scenario !== 'message-constructors' &&
    scenario !== 'workspace'
  ) {
    return fail(`--scenario must be all, message-constructors or workspace.`)
  }

  return {
    scenario,
    runs: parsePositiveInteger(values.runs, '--runs'),
    timeoutMs: parsePositiveInteger(values['timeout-ms'], '--timeout-ms'),
  }
}

const delay = (milliseconds: number): Promise<void> =>
  new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))

class LspClient {
  private readonly child = spawn(
    nativeCompilerExecutable(),
    ['--lsp', '--stdio'],
    { cwd: workspaceRoot, stdio: ['pipe', 'pipe', 'pipe'] },
  )
  private readonly connection: MessageConnection
  private readonly exitPromise: Promise<void>
  private stderr = ''
  private hasExited = false
  private lifecycleError: Error | undefined

  get processId(): number {
    return this.child.pid ?? fail(`Language server has no process ID.`)
  }

  constructor() {
    this.exitPromise = new Promise(resolveExit => {
      this.child.once('error', error => {
        this.lifecycleError = error
        if (this.child.pid === undefined) {
          this.hasExited = true
          resolveExit()
        }
      })
      this.child.once('close', (code, signal) => {
        this.hasExited = true
        const detail = signal === null ? `code ${code}` : `signal ${signal}`
        this.lifecycleError ??= new Error(
          `TypeScript language server exited with ${detail}.${
            this.stderr === '' ? '' : ` ${this.stderr.trim()}`
          }`,
        )
        resolveExit()
      })
    })
    this.child.stderr.on('data', chunk => {
      this.stderr += chunk.toString()
    })
    this.connection = createMessageConnection(
      new StreamMessageReader(this.child.stdout),
      new StreamMessageWriter(this.child.stdin),
    )
    this.connection.onRequest((method, params) => {
      if (method === 'workspace/configuration') {
        const items =
          params !== null &&
          typeof params === 'object' &&
          'items' in params &&
          globalThis.Array.isArray(params.items)
            ? params.items
            : []
        return items.map(() => null)
      } else if (method === 'workspace/workspaceFolders') {
        return [
          { uri: pathToFileURL(workspaceRoot).href, name: 'foldkit-monorepo' },
        ]
      }
      return null
    })
    this.connection.onError(([error]) => {
      this.lifecycleError = error
    })
    this.connection.listen()
  }

  async notify(method: string, params?: unknown): Promise<void> {
    if (this.lifecycleError !== undefined) {
      throw this.lifecycleError
    }
    await this.connection.sendNotification(method, params)
  }

  async request(
    method: string,
    params: unknown,
    timeoutMs: number,
  ): Promise<Response> {
    if (this.lifecycleError !== undefined) {
      throw this.lifecycleError
    }

    const started = performance.now()
    let timeoutHandle: NodeJS.Timeout | undefined
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () =>
          reject(new Error(`${method} exceeded its ${timeoutMs}ms timeout.`)),
        timeoutMs,
      )
    })
    try {
      const result = await Promise.race([
        this.connection.sendRequest<unknown>(method, params),
        timeout,
      ])
      return { result, latencyMs: performance.now() - started }
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle)
      }
    }
  }

  async close(timeoutMs: number): Promise<void> {
    if (this.hasExited) {
      this.connection.dispose()
      return
    }

    try {
      await this.request(
        'shutdown',
        undefined,
        globalThis.Math.min(5_000, timeoutMs),
      )
      await this.notify('exit')
      this.child.stdin.end()
      await Promise.race([this.exitPromise, delay(2_000)])
    } catch {
      this.child.kill('SIGTERM')
      await Promise.race([this.exitPromise, delay(2_000)])
    }

    if (!this.hasExited) {
      this.child.kill('SIGKILL')
      await Promise.race([this.exitPromise, delay(2_000)])
    }

    this.connection.dispose()
    if (!this.hasExited) {
      return fail(`TypeScript language server did not exit after SIGKILL.`)
    }
  }
}

export const readServerRssKiB = (output: string): number => {
  const text = output.trim()
  const rssKiB = globalThis.Number(text)
  if (
    !/^\d+$/.test(text) ||
    !globalThis.Number.isSafeInteger(rssKiB) ||
    rssKiB < 1
  ) {
    return fail(
      `ps returned an invalid RSS measurement: ${JSON.stringify(output)}.`,
    )
  }

  return rssKiB
}

const readServerProcessRssKiB = async (processId: number): Promise<number> => {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    return fail(
      `Workspace RSS sampling supports macOS and Linux, received ${process.platform}.`,
    )
  }

  const { stdout } = await runProcess(
    'ps',
    ['-o', 'rss=', '-p', globalThis.String(processId)],
    {
      encoding: 'utf8',
      timeout: serverMemorySampleTimeoutMs,
      maxBuffer: 1_024,
    },
  )

  return readServerRssKiB(stdout)
}

export const startServerMemorySampler = async (
  processId: number,
  scenario: string,
  readRssKiB: (processId: number) => Promise<number> = readServerProcessRssKiB,
) => {
  const started = performance.now()
  const samples: Array<ServerMemorySample> = []
  let samplingError: unknown
  let isSampling = false
  let pendingSample = Promise.resolve()
  let stopPromise: Promise<ServerMemory> | undefined

  const sample = async (phase: ServerMemorySample['phase']): Promise<void> => {
    const rssKiB = await readRssKiB(processId)
    samples.push({
      phase,
      elapsedMs: globalThis.Number((performance.now() - started).toFixed(3)),
      rssKiB,
    })
  }

  await sample('Startup')
  const timer = setInterval(() => {
    if (
      stopPromise !== undefined ||
      isSampling ||
      samplingError !== undefined
    ) {
      return
    }

    isSampling = true
    pendingSample = sample('Interval')
      .catch(error => {
        samplingError = error
      })
      .finally(() => {
        isSampling = false
      })
  }, serverMemorySamplingIntervalMs)

  return {
    stop: (): Promise<ServerMemory> => {
      if (stopPromise !== undefined) {
        return stopPromise
      }

      clearInterval(timer)
      stopPromise = (async () => {
        await pendingSample

        if (samplingError !== undefined) {
          throw samplingError
        }

        await sample('Final')

        return {
          scenario,
          method: 'ps -o rss= -p <pid>',
          unit: 'KiB',
          samplingIntervalMs: serverMemorySamplingIntervalMs,
          peakRssKiB: globalThis.Math.max(
            ...samples.map(({ rssKiB }) => rssKiB),
          ),
          samples: [...samples],
        }
      })()

      return stopPromise
    },
  }
}

const document = (relativePath: string): SourceDocument => {
  const path = join(workspaceRoot, relativePath)
  const originalText = readFileSync(path, 'utf8')
  return {
    uri: pathToFileURL(path).href,
    originalText,
    version: 1,
    text: originalText,
  }
}

const positionAt = (text: string, offset: number): Position => {
  const lines = text.slice(0, offset).split('\n')
  return { line: lines.length - 1, character: lines.at(-1)?.length ?? 0 }
}

const occurrence = (text: string, needle: string, within?: string): number => {
  const contextStart =
    within === undefined
      ? 0
      : Option.getOrElse(String.indexOf(within)(text), () =>
          fail(`Could not find context marker ${within}.`),
        )
  const offset = Option.getOrElse(
    String.indexOf(needle)(text.slice(contextStart)),
    () => fail(`Could not find workload marker ${needle}.`),
  )

  return contextStart + offset
}

const requestTarget = (
  request: RequestTargetConfig,
  source: SourceDocument,
  needle: string,
  within?: string,
): RequestTarget => ({
  ...request,
  source,
  position: positionAt(
    source.originalText,
    occurrence(source.originalText, needle, within) + needle.length / 2,
  ),
})

const bindingFactoryMarker = (text: string): string => {
  if (text.includes('.makeBinding')) {
    return 'makeBinding'
  } else if (text.includes('.bindChild')) {
    return 'bindChild'
  }

  return fail(`Could not find makeBinding or bindChild in Website composition.`)
}

const openDocument = async (
  client: LspClient,
  source: SourceDocument,
  text = source.originalText,
): Promise<void> => {
  source.text = text
  await client.notify('textDocument/didOpen', {
    textDocument: {
      uri: source.uri,
      languageId: 'typescript',
      version: source.version,
      text,
    },
  })
}

const changeDocument = async (
  client: LspClient,
  source: SourceDocument,
  text: string,
): Promise<void> => {
  source.version += 1
  source.text = text
  await client.notify('textDocument/didChange', {
    textDocument: { uri: source.uri, version: source.version },
    contentChanges: [{ text }],
  })
}

const uniqueOccurrence = (text: string, needle: string): number => {
  const start = occurrence(text, needle)
  if (text.includes(needle, start + needle.length)) {
    return fail(`Workload marker ${needle} occurs more than once.`)
  }
  return start
}

const replaceDocumentRange = async (
  client: LspClient,
  source: SourceDocument,
  start: number,
  end: number,
  replacement: string,
): Promise<void> => {
  const range = {
    start: positionAt(source.text, start),
    end: positionAt(source.text, end),
  }
  source.text = `${source.text.slice(0, start)}${replacement}${source.text.slice(end)}`
  source.version += 1
  await client.notify('textDocument/didChange', {
    textDocument: { uri: source.uri, version: source.version },
    contentChanges: [{ range, text: replacement }],
  })
}

const appendNewline = (
  client: LspClient,
  source: SourceDocument,
): Promise<void> =>
  replaceDocumentRange(
    client,
    source,
    source.text.length,
    source.text.length,
    '\n',
  )

const serverInfoFrom = (response: Response): ServerInfo => {
  const result = response.result
  const serverInfo =
    result !== null &&
    typeof result === 'object' &&
    'serverInfo' in result &&
    result.serverInfo !== null &&
    typeof result.serverInfo === 'object'
      ? result.serverInfo
      : undefined
  const name =
    serverInfo !== undefined &&
    'name' in serverInfo &&
    Predicate.isString(serverInfo.name) &&
    String.isNonEmpty(String.trim(serverInfo.name))
      ? serverInfo.name
      : fail(`Language server initialize response has no name.`)
  const version =
    serverInfo !== undefined &&
    'version' in serverInfo &&
    Predicate.isString(serverInfo.version)
      ? serverInfo.version
      : 'unknown'

  return { name, version }
}

const initLanguageServer = async (
  client: LspClient,
  timeoutMs: number,
): Promise<ServerInfo> => {
  const rootUri = pathToFileURL(workspaceRoot).href
  const response = await client.request(
    'initialize',
    {
      processId: process.pid,
      rootUri,
      capabilities: {
        general: { positionEncodings: ['utf-16'] },
        workspace: {
          configuration: true,
          workspaceFolders: true,
          diagnostics: { refreshSupport: true },
        },
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
          definition: { linkSupport: true },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          diagnostic: {
            dynamicRegistration: true,
            relatedDocumentSupport: false,
          },
        },
      },
      workspaceFolders: [{ uri: rootUri, name: 'foldkit-monorepo' }],
    },
    timeoutMs,
  )
  const result = response.result
  if (
    !Predicate.isObject(result) ||
    !Predicate.isObject(result['capabilities'])
  ) {
    return fail(`Language server initialize response has no capabilities.`)
  }
  const capabilities = result['capabilities']
  const sync = capabilities['textDocumentSync']
  const change = Predicate.isObject(sync) ? sync['change'] : sync
  if (change !== 2) {
    return fail(
      `Language server must support incremental document synchronization.`,
    )
  }
  if (
    capabilities['positionEncoding'] !== undefined &&
    capabilities['positionEncoding'] !== 'utf-16'
  ) {
    return fail(`Language server must use UTF-16 positions.`)
  }
  if (!Predicate.isObject(capabilities['diagnosticProvider'])) {
    return fail(`Language server must advertise pull diagnostics.`)
  }
  await client.notify('initialized', {})
  return serverInfoFrom(response)
}

const completionItems = (result: unknown): ReadonlyArray<unknown> => {
  if (globalThis.Array.isArray(result)) {
    return result
  }

  if (
    result !== null &&
    typeof result === 'object' &&
    'items' in result &&
    globalThis.Array.isArray(result.items)
  ) {
    return result.items
  }

  return []
}

const markedStringText = (contents: unknown): string => {
  if (Predicate.isString(contents)) {
    return contents
  }

  if (
    contents !== null &&
    typeof contents === 'object' &&
    'value' in contents &&
    Predicate.isString(contents.value) &&
    'language' in contents &&
    Predicate.isString(contents.language)
  ) {
    return contents.value
  }

  return fail(`Hover returned an unsupported contents value.`)
}

const hoverText = (contents: unknown): string => {
  if (globalThis.Array.isArray(contents)) {
    return contents.map(markedStringText).join('\n')
  }

  if (
    contents !== null &&
    typeof contents === 'object' &&
    'kind' in contents &&
    (contents.kind === 'markdown' || contents.kind === 'plaintext') &&
    'value' in contents &&
    Predicate.isString(contents.value)
  ) {
    return contents.value
  }

  return markedStringText(contents)
}

export const validateResult = (
  label: string,
  target: RequestTarget,
  result: unknown,
): number | undefined => {
  if (target.method === 'textDocument/hover') {
    if (
      result === null ||
      typeof result !== 'object' ||
      !('contents' in result) ||
      String.isEmpty(String.trim(hoverText(result.contents)))
    ) {
      return fail(`${label} returned no hover contents.`)
    }

    if (target.expectedBinding !== undefined) {
      const {
        name,
        owner,
        typeNames = ['InitializedBinding'],
        schemaHeaderFragments,
        namedBoundaryFragments,
        requireSchemaHeader = false,
      } = target.expectedBinding
      const text = hoverText(result.contents)
      const hasExpectedBindingType = typeNames.some(typeName =>
        new RegExp(`${name}:\\s*${typeName.replaceAll('.', '\\.')}<`).test(
          text,
        ),
      )
      const isErased =
        new RegExp(`${name}:\\s*(any|unknown|never)(?:\\s|$|\u0060)`).test(
          text,
        ) ||
        typeNames.some(typeName =>
          new RegExp(
            `${name}:\\s*${typeName.replaceAll('.', '\\.')}<\\s*(any|unknown|never)\\s*[,>]`,
          ).test(text),
        )
      const hasVisibleOwner = text.includes('Owner<"')
      const hasExpectedOwner = text.includes(`Owner<"${owner}"`)
      const hasSchemaHeader =
        (schemaHeaderFragments !== undefined &&
          EffectArray.isReadonlyArrayNonEmpty(schemaHeaderFragments) &&
          schemaHeaderFragments.every(fragment => text.includes(fragment))) ||
        (namedBoundaryFragments !== undefined &&
          EffectArray.isReadonlyArrayNonEmpty(namedBoundaryFragments) &&
          namedBoundaryFragments.every(fragment => text.includes(fragment)))
      if (
        !hasExpectedBindingType ||
        isErased ||
        (hasVisibleOwner && !hasExpectedOwner) ||
        ((requireSchemaHeader || !hasVisibleOwner) && !hasSchemaHeader)
      ) {
        return fail(
          `${label} returned an erased or unexpected visible Binding shape. Visible hover: ${text}`,
        )
      }
    }
    return undefined
  }

  if (target.method === 'textDocument/definition') {
    if (!globalThis.Array.isArray(result) || result.length < 1) {
      return fail(`${label} returned no definitions.`)
    }

    return result.length
  }

  if (target.method === 'textDocument/completion') {
    const items = completionItems(result)
    if (Option.isNone(EffectArray.head(items))) {
      return fail(`${label} returned no completions.`)
    }
    if (Option.isNone(EffectArray.head(target.expectedLabels))) {
      return fail(`${label} defines no expected completion labels.`)
    }

    const labels = items.flatMap(item =>
      item !== null &&
      typeof item === 'object' &&
      'label' in item &&
      Predicate.isString(item.label)
        ? [item.label]
        : [],
    )
    const missingLabels = target.expectedLabels.filter(
      expectedLabel => !labels.includes(expectedLabel),
    )
    if (EffectArray.isArrayNonEmpty(missingLabels)) {
      return fail(
        `${label} did not return the expected ${missingLabels.join(', ')} completions.`,
      )
    }

    return items.length
  }

  return fail(`No result validation is defined for the request.`)
}

const measure = async (
  client: LspClient,
  timeoutMs: number,
  label: string,
  target: RequestTarget,
): Promise<Measurement> => {
  const response = await client.request(
    target.method,
    { textDocument: { uri: target.source.uri }, position: target.position },
    timeoutMs,
  )
  const count = validateResult(label, target, response.result)
  const serializedResult =
    JSON.stringify(response.result) ?? fail(`${label} returned no JSON result.`)

  return {
    label,
    latencyMs: globalThis.Number(response.latencyMs.toFixed(3)),
    resultCount: count,
    resultBytes: Buffer.byteLength(serializedResult),
    resultSha256: sha256(serializedResult),
    documentVersion: target.source.version,
    sourceSha256: sha256(target.source.text),
  }
}

const measurePair = async (
  client: LspClient,
  timeoutMs: number,
  labels: readonly [first: string, warm: string],
  target: RequestTarget,
): Promise<readonly [Measurement, Measurement]> => [
  await measure(client, timeoutMs, labels[0], target),
  await measure(client, timeoutMs, labels[1], target),
]

const editThenMeasurePair = async (
  client: LspClient,
  timeoutMs: number,
  labels: readonly [first: string, warm: string],
  target: RequestTarget,
  text: string,
): Promise<readonly [Measurement, Measurement]> => {
  await changeDocument(client, target.source, text)
  return measurePair(client, timeoutMs, labels, target)
}

const runScenario = async (
  timeoutMs: number,
  execute: (client: LspClient) => Promise<ReadonlyArray<Measurement>>,
  memoryScenario?: string,
): Promise<ScenarioResult> => {
  const client = new LspClient()
  let memorySampler:
    | Awaited<ReturnType<typeof startServerMemorySampler>>
    | undefined
  try {
    if (memoryScenario !== undefined) {
      memorySampler = await startServerMemorySampler(
        client.processId,
        memoryScenario,
      )
    }

    const serverInfo = await initLanguageServer(client, timeoutMs)
    const measurements = await execute(client)
    return {
      serverInfo,
      measurements,
      ...(memorySampler === undefined
        ? {}
        : { serverMemory: await memorySampler.stop() }),
    }
  } finally {
    try {
      await memorySampler?.stop()
    } finally {
      await client.close(timeoutMs)
    }
  }
}

const hoverScenario = (timeoutMs: number): Promise<ScenarioResult> =>
  runScenario(timeoutMs, async client => {
    const definition = document(definitionPath)
    const composition = document(compositionPath)
    await openDocument(client, definition)
    await openDocument(client, composition)

    const definitionTarget = requestTarget(
      { method: 'textDocument/hover' },
      definition,
      'ApplicationDefinition',
    )
    const bindingTarget = requestTarget(
      { method: 'textDocument/hover' },
      composition,
      'SearchBinding',
    )
    const measurements = [
      ...(await measurePair(
        client,
        timeoutMs,
        ['hover.first', 'hover.warm'],
        definitionTarget,
      )),
    ]

    measurements.push(
      ...(await editThenMeasurePair(
        client,
        timeoutMs,
        ['hover.postWhitespace', 'hover.postWhitespaceWarm'],
        bindingTarget,
        `${composition.originalText}\n`,
      )),
    )

    measurements.push(
      ...(await editThenMeasurePair(
        client,
        timeoutMs,
        ['hover.postSemantic', 'hover.postSemanticWarm'],
        bindingTarget,
        `${composition.originalText}\nexport const ProfilingSemanticEdit = 1\n`,
      )),
    )

    return measurements
  })

const definitionScenario = (timeoutMs: number): Promise<ScenarioResult> =>
  runScenario(timeoutMs, async client => {
    const composition = document(compositionPath)
    await openDocument(client, composition)
    const marker = bindingFactoryMarker(composition.originalText)
    const target = requestTarget(
      { method: 'textDocument/definition' },
      composition,
      marker,
    )
    const measurements = [
      ...(await measurePair(
        client,
        timeoutMs,
        ['definition.first', 'definition.warm'],
        target,
      )),
    ]

    measurements.push(
      ...(await editThenMeasurePair(
        client,
        timeoutMs,
        ['definition.postWhitespace', 'definition.postWhitespaceWarm'],
        target,
        `${composition.originalText}\n`,
      )),
    )
    return measurements
  })

const completionScenario = (timeoutMs: number): Promise<ScenarioResult> =>
  runScenario(timeoutMs, async client => {
    const changedUrl = document(changedUrlPath)
    const completionNeedle =
      'previousRoute.exampleSlug === nextRoute.exampleSlug'
    const completionStart = occurrence(
      changedUrl.originalText,
      completionNeedle,
      "Transition.stayed(transition, 'ExampleDetail')",
    )
    const completionText = `${changedUrl.originalText.slice(
      0,
      completionStart,
    )}previousRoute.${changedUrl.originalText.slice(
      completionStart + 'previousRoute.exampleSlug'.length,
    )}`
    await openDocument(client, changedUrl, completionText)
    const target: RequestTarget = {
      method: 'textDocument/completion',
      expectedLabels: ['_tag', 'exampleSlug'],
      source: changedUrl,
      position: positionAt(
        completionText,
        completionStart + 'previousRoute.'.length,
      ),
    }
    const measurements = [
      ...(await measurePair(
        client,
        timeoutMs,
        ['completion.first', 'completion.warm'],
        target,
      )),
    ]

    measurements.push(
      ...(await editThenMeasurePair(
        client,
        timeoutMs,
        ['completion.postWhitespace', 'completion.postWhitespaceWarm'],
        target,
        `${completionText}\n`,
      )),
    )
    return measurements
  })

const bindingCompletionTarget = (source: SourceDocument): RequestTarget => ({
  method: 'textDocument/completion',
  expectedLabels: ['informRouteChanged', 'embedView'],
  source,
  position: positionAt(
    source.text,
    uniqueOccurrence(source.text, bindingCall) + 'SearchBinding.'.length,
  ),
})

const bindingCompletionScenario = (
  timeoutMs: number,
): Promise<ScenarioResult> =>
  runScenario(timeoutMs, async client => {
    const changedUrl = document(changedUrlPath)
    const target = bindingCompletionTarget(changedUrl)
    await openDocument(client, changedUrl)
    const measurements = [
      ...(await measurePair(
        client,
        timeoutMs,
        ['bindingCompletion.first', 'bindingCompletion.warm'],
        target,
      )),
    ]

    await appendNewline(client, changedUrl)
    measurements.push(
      ...(await measurePair(
        client,
        timeoutMs,
        [
          'bindingCompletion.postWhitespace',
          'bindingCompletion.postWhitespaceWarm',
        ],
        target,
      )),
    )
    return measurements
  })

const diagnosticPosition = (value: unknown): Position => {
  if (
    !Predicate.isObject(value) ||
    !Predicate.isNumber(value['line']) ||
    !globalThis.Number.isInteger(value['line']) ||
    value['line'] < 0 ||
    !Predicate.isNumber(value['character']) ||
    !globalThis.Number.isInteger(value['character']) ||
    value['character'] < 0
  ) {
    return fail(`Diagnostic has an invalid position.`)
  }
  return { line: value['line'], character: value['character'] }
}

const findRouteError = (
  source: SourceDocument,
  errors: ReadonlyArray<unknown>,
): Option.Option<unknown> => {
  const routeStart = positionAt(
    source.text,
    uniqueOccurrence(source.text, 'route: () => '),
  )
  const routeEnd = {
    line: routeStart.line,
    character: routeStart.character + 'route'.length,
  }
  return EffectArray.findFirst(errors, diagnostic => {
    if (
      !Predicate.isObject(diagnostic) ||
      diagnostic['code'] !== routeErrorCode ||
      !Predicate.isString(diagnostic['message']) ||
      !/number/.test(diagnostic['message']) ||
      !/assignable/.test(diagnostic['message']) ||
      !Predicate.isObject(diagnostic['range'])
    ) {
      return false
    }
    const start = diagnosticPosition(diagnostic['range']['start'])
    const end = diagnosticPosition(diagnostic['range']['end'])
    return (
      start.line === routeStart.line &&
      start.character === routeStart.character &&
      end.line === routeEnd.line &&
      end.character === routeEnd.character
    )
  })
}

export const findWorkspaceTitleError = (
  source: Pick<SourceDocument, 'text'>,
  errors: ReadonlyArray<unknown>,
): Option.Option<unknown> => {
  const titleStart = positionAt(
    source.text,
    uniqueOccurrence(source.text, `title: () => ${workspaceInvalidTitle}`),
  )
  const titleEnd = {
    line: titleStart.line,
    character: titleStart.character + 'title'.length,
  }

  return EffectArray.findFirst(errors, diagnostic => {
    if (
      !Predicate.isObject(diagnostic) ||
      diagnostic['code'] !== routeErrorCode ||
      !Predicate.isString(diagnostic['message']) ||
      !/number/.test(diagnostic['message']) ||
      !/assignable/.test(diagnostic['message']) ||
      !Predicate.isObject(diagnostic['range'])
    ) {
      return false
    }

    const start = diagnosticPosition(diagnostic['range']['start'])
    const end = diagnosticPosition(diagnostic['range']['end'])
    return (
      start.line === titleStart.line &&
      start.character === titleStart.character &&
      end.line === titleEnd.line &&
      end.character === titleEnd.character
    )
  })
}

const findExpectedDiagnostic = (
  source: SourceDocument,
  errors: ReadonlyArray<unknown>,
  expected: 'Clean' | 'RouteError' | 'TitleError',
): Option.Option<unknown> => {
  if (expected === 'RouteError') {
    return findRouteError(source, errors)
  } else if (expected === 'TitleError') {
    return findWorkspaceTitleError(source, errors)
  } else {
    return Option.none()
  }
}

const measureDiagnostic = async (
  client: LspClient,
  timeoutMs: number,
  label: string,
  source: SourceDocument,
  expected: 'Clean' | 'RouteError' | 'TitleError',
): Promise<Measurement> => {
  const response = await client.request(
    'textDocument/diagnostic',
    { textDocument: { uri: source.uri } },
    timeoutMs,
  )
  const { result } = response
  if (
    !Predicate.isObject(result) ||
    result['kind'] !== 'full' ||
    !globalThis.Array.isArray(result['items'])
  ) {
    return fail(`${label} did not return a full diagnostic report.`)
  }
  const diagnostics: ReadonlyArray<unknown> = result['items']
  const errors = diagnostics.filter(
    diagnostic =>
      Predicate.isObject(diagnostic) &&
      diagnostic['severity'] === errorSeverity,
  )
  const maybeExpectedError = findExpectedDiagnostic(source, errors, expected)
  if (expected === 'Clean' && EffectArray.isArrayNonEmpty(errors)) {
    return fail(`${label} retained errors: ${JSON.stringify(errors)}.`)
  }
  if (expected === 'RouteError' && Option.isNone(maybeExpectedError)) {
    return fail(
      `${label} did not report TS${routeErrorCode} at the route property.`,
    )
  }
  if (
    expected === 'TitleError' &&
    (Option.isNone(maybeExpectedError) || errors.length !== 1)
  ) {
    return fail(
      `${label} did not report exactly one TS${routeErrorCode} at the title property.`,
    )
  }

  const diagnosticEvidence = Option.match(maybeExpectedError, {
    onNone: () => ({ expected, errorCount: errors.length }),
    onSome: diagnostic => {
      if (
        !Predicate.isObject(diagnostic) ||
        !Predicate.isObject(diagnostic['range'])
      ) {
        return fail(`${label} has no diagnostic range.`)
      }
      return {
        expected,
        errorCount: errors.length,
        code: routeErrorCode,
        range: {
          start: diagnosticPosition(diagnostic['range']['start']),
          end: diagnosticPosition(diagnostic['range']['end']),
        },
      }
    },
  })
  const serializedResult =
    JSON.stringify(result) ?? fail(`${label} returned no JSON result.`)
  return {
    label,
    latencyMs: globalThis.Number(response.latencyMs.toFixed(3)),
    resultCount: diagnostics.length,
    resultBytes: Buffer.byteLength(serializedResult),
    resultSha256: sha256(serializedResult),
    documentVersion: source.version,
    sourceSha256: sha256(source.text),
    diagnosticEvidence,
  }
}

type MessageConstructorAccess = 'local' | 'completed'

const messageConstructorSource = (access: MessageConstructorAccess): string => {
  const expression =
    access === 'local'
      ? 'Message.ChangedUrl'
      : 'ApplicationBlock.Message.ChangedUrl'

  return [
    "import { ApplicationBlock } from './block'",
    "import { Message } from './message'",
    'void ApplicationBlock',
    'void Message',
    `export const onUrlChange = ${expression}`,
    '',
  ].join('\n')
}

const messageConstructorScenario = (
  timeoutMs: number,
  access: MessageConstructorAccess,
): Promise<ScenarioResult> =>
  runScenario(timeoutMs, async client => {
    const entry = document('packages/website/src/entry.ts')
    await openDocument(client, entry, messageConstructorSource(access))

    return [
      await measureDiagnostic(
        client,
        timeoutMs,
        `messageConstructor.${access}.cold`,
        entry,
        'Clean',
      ),
    ]
  })

const changedUrlWorkflowScenario = (
  timeoutMs: number,
): Promise<ScenarioResult> =>
  runScenario(timeoutMs, async client => {
    const changedUrl = document(changedUrlPath)
    const bindingStart = uniqueOccurrence(changedUrl.text, bindingCall)
    uniqueOccurrence(changedUrl.text, routeWriter)
    const target: RequestTarget = {
      method: 'textDocument/hover',
      expectedBinding: searchBindingHover,
      source: changedUrl,
      position: positionAt(changedUrl.text, bindingStart + 'Search'.length),
    }
    await openDocument(client, changedUrl)
    const measurements = [
      ...(await measurePair(
        client,
        timeoutMs,
        ['changedUrl.hover.first', 'changedUrl.hover.warm'],
        target,
      )),
    ]

    await appendNewline(client, changedUrl)
    measurements.push(
      ...(await measurePair(
        client,
        timeoutMs,
        [
          'changedUrl.hover.postWhitespace',
          'changedUrl.hover.postWhitespaceWarm',
        ],
        target,
      )),
      await measureDiagnostic(
        client,
        timeoutMs,
        'changedUrl.diagnostics.clean',
        changedUrl,
        'Clean',
      ),
    )

    const routeValueStart =
      uniqueOccurrence(changedUrl.text, routeWriter) + 'route: () => '.length
    await replaceDocumentRange(
      client,
      changedUrl,
      routeValueStart,
      routeValueStart + 'nextRoute'.length,
      '1709',
    )
    measurements.push(
      await measureDiagnostic(
        client,
        timeoutMs,
        'changedUrl.diagnostics.badRoute',
        changedUrl,
        'RouteError',
      ),
    )

    const invalidValueStart =
      uniqueOccurrence(changedUrl.text, 'route: () => 1709') +
      'route: () => '.length
    await replaceDocumentRange(
      client,
      changedUrl,
      invalidValueStart,
      invalidValueStart + '1709'.length,
      'nextRoute',
    )
    measurements.push(
      await measureDiagnostic(
        client,
        timeoutMs,
        'changedUrl.diagnostics.restored',
        changedUrl,
        'Clean',
      ),
      ...(await measurePair(
        client,
        timeoutMs,
        ['changedUrl.hover.postRestore', 'changedUrl.hover.postRestoreWarm'],
        target,
      )),
      await measure(
        client,
        timeoutMs,
        'changedUrl.completion.postRestoreWarm',
        bindingCompletionTarget(changedUrl),
      ),
    )
    if (changedUrl.text !== `${changedUrl.originalText}\n`) {
      return fail(`Changed URL workflow did not restore the original source.`)
    }
    return measurements
  })

const workspaceRequestScenario = (
  timeoutMs: number,
  label: string,
  sourcePath: string,
  toTarget: (source: SourceDocument) => RequestTarget,
): Promise<ScenarioResult> =>
  runScenario(
    timeoutMs,
    async client => {
      const source = document(sourcePath)
      const target = toTarget(source)
      await openDocument(client, source, source.text)
      const measurements = [
        ...(await measurePair(
          client,
          timeoutMs,
          [`${label}.first`, `${label}.warm`],
          target,
        )),
      ]

      await appendNewline(client, source)
      measurements.push(
        ...(await measurePair(
          client,
          timeoutMs,
          [`${label}.postWhitespace`, `${label}.postWhitespaceWarm`],
          target,
        )),
      )
      return measurements
    },
    label,
  )

const workspaceBindingHoverScenario = (
  timeoutMs: number,
): Promise<ScenarioResult> =>
  workspaceRequestScenario(
    timeoutMs,
    'workspace.bindingHover',
    workspaceCompositionPath,
    source => {
      uniqueOccurrence(source.text, 'export const IssueDetailBinding')
      return requestTarget(
        {
          method: 'textDocument/hover',
          expectedBinding: workspaceBindingHover,
        },
        source,
        'IssueDetailBinding',
        'export const IssueDetailBinding',
      )
    },
  )

export const workspaceBindingCompletionTarget = (
  source: SourceDocument,
): RequestTarget => ({
  method: 'textDocument/completion',
  expectedLabels: ['requestSave', 'embedView', 'init'],
  source,
  position: positionAt(
    source.text,
    uniqueOccurrence(source.text, workspaceBindingProbe) +
      '\nIssueDetailBinding.'.length,
  ),
})

const workspaceBindingCompletionScenario = (
  timeoutMs: number,
): Promise<ScenarioResult> =>
  workspaceRequestScenario(
    timeoutMs,
    'workspace.bindingCompletion',
    workspaceUpdatePath,
    source => {
      source.text = `${source.text}${workspaceBindingProbe}`
      return workspaceBindingCompletionTarget(source)
    },
  )

export const workspaceBlockCompletionTarget = (
  source: SourceDocument,
): RequestTarget => ({
  method: 'textDocument/completion',
  expectedLabels: [
    'Model',
    'Message',
    'init',
    'makeView',
    'replaceEffectsLayer',
  ],
  source,
  position: positionAt(
    source.text,
    uniqueOccurrence(source.text, workspaceBlockAccess) +
      'ApplicationBlock.'.length,
  ),
})

const workspaceBlockCompletionScenario = (
  timeoutMs: number,
): Promise<ScenarioResult> =>
  workspaceRequestScenario(
    timeoutMs,
    'workspace.blockCompletion',
    workspaceEntryPath,
    workspaceBlockCompletionTarget,
  )

const workspaceTitleWorkflowScenario = (
  timeoutMs: number,
): Promise<ScenarioResult> =>
  runScenario(
    timeoutMs,
    async client => {
      const update = document(workspaceDetailUpdatePath)
      uniqueOccurrence(update.text, workspaceTitleWriter)
      await openDocument(client, update)
      const measurements = [
        await measureDiagnostic(
          client,
          timeoutMs,
          'workspace.diagnostics.clean',
          update,
          'Clean',
        ),
      ]

      await appendNewline(client, update)
      const titleValueStart =
        uniqueOccurrence(update.text, workspaceTitleWriter) +
        'title: () => '.length
      await replaceDocumentRange(
        client,
        update,
        titleValueStart,
        titleValueStart + 'value'.length,
        workspaceInvalidTitle,
      )
      measurements.push(
        await measureDiagnostic(
          client,
          timeoutMs,
          'workspace.diagnostics.badTitle',
          update,
          'TitleError',
        ),
      )

      const invalidValueStart =
        uniqueOccurrence(update.text, `title: () => ${workspaceInvalidTitle}`) +
        'title: () => '.length
      await replaceDocumentRange(
        client,
        update,
        invalidValueStart,
        invalidValueStart + workspaceInvalidTitle.length,
        'value',
      )
      measurements.push(
        await measureDiagnostic(
          client,
          timeoutMs,
          'workspace.diagnostics.restored',
          update,
          'Clean',
        ),
      )

      if (update.text !== `${update.originalText}\n`) {
        return fail(
          `Workspace title workflow did not restore the original source.`,
        )
      }

      return measurements
    },
    'workspace.diagnostics',
  )

const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex')

const filesBelow = (
  directory: string,
  pattern: string,
  isIncludingDist = false,
): ReadonlyArray<string> =>
  globSync(pattern, {
    cwd: directory,
    exclude: [
      '**/node_modules/**',
      '**/coverage/**',
      ...(isIncludingDist ? [] : ['**/dist/**']),
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  }).map(path => join(directory, path))

const workloadHash = (scenario: Options['scenario']): string => {
  const workspaceSourceRoots = [
    join(workspaceRoot, 'packages'),
    join(workspaceRoot, 'internal'),
  ]
  const foldkitDeclarations = join(packageRoot, 'dist')
  if (
    !existsSync(foldkitDeclarations) ||
    !statSync(foldkitDeclarations).isDirectory()
  ) {
    return fail(
      `Build packages/foldkit before profiling language-service latency.`,
    )
  }
  const websiteRoot = join(workspaceRoot, 'packages/website')
  const workspaceExampleRoot = join(workspaceRoot, 'examples/workspace')
  const workspaceExamplePaths =
    scenario === 'workspace'
      ? [
          join(workspaceExampleRoot, 'package.json'),
          join(workspaceExampleRoot, 'tsconfig.json'),
          ...filesBelow(workspaceExampleRoot, '**/*.{ts,tsx,mts,cts}'),
        ]
      : []
  const paths = globalThis.Array.from(
    new Set([
      join(workspaceRoot, 'package.json'),
      join(workspaceRoot, 'pnpm-lock.yaml'),
      join(workspaceRoot, 'pnpm-workspace.yaml'),
      join(workspaceRoot, 'tsconfig.base.json'),
      join(websiteRoot, 'package.json'),
      join(websiteRoot, 'tsconfig.json'),
      ...filesBelow(websiteRoot, '**/*.{ts,tsx,mts,cts}'),
      ...workspaceExamplePaths,
      ...workspaceSourceRoots.flatMap(root =>
        filesBelow(root, '**/package.json'),
      ),
      ...workspaceSourceRoots.flatMap(root =>
        filesBelow(root, '**/src/**/*.{ts,tsx,mts,cts}'),
      ),
      ...workspaceSourceRoots.flatMap(root =>
        filesBelow(root, '**/*.d.{ts,mts,cts}', true),
      ),
      ...workspaceSourceRoots.flatMap(root =>
        filesBelow(root, '**/*.d.{ts,mts,cts}.map', true),
      ),
    ]),
  ).sort()
  const hash = createHash('sha256')
  for (const path of paths) {
    hash.update(relative(workspaceRoot, path))
    hash.update('\0')
    hash.update(readFileSync(path))
    hash.update('\0')
  }
  return hash.digest('hex')
}

const gitOutput = (args: ReadonlyArray<string>): string =>
  execFileSync('git', args, { cwd: workspaceRoot, encoding: 'utf8' }).trim()

const compilerVersion = (): string => {
  const manifest: unknown = JSON.parse(
    readFileSync(typescriptManifestPath, 'utf8'),
  )
  if (
    manifest === null ||
    typeof manifest !== 'object' ||
    !('version' in manifest) ||
    !Predicate.isString(manifest.version)
  ) {
    return fail(`Could not read the pinned TypeScript version.`)
  }
  return manifest.version
}

const median = (values: ReadonlyArray<number>): number => {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = globalThis.Math.floor(sorted.length / 2)
  const right = sorted.at(middle) ?? fail(`Cannot summarize empty samples.`)
  if (sorted.length % 2 === 1) {
    return right
  }
  const left = sorted.at(middle - 1) ?? right
  return (left + right) / 2
}

const summarize = (
  runs: ReadonlyArray<Readonly<{ measurements: ReadonlyArray<Measurement> }>>,
) => {
  const samples = new Map<string, Array<number>>()
  for (const run of runs) {
    for (const measurement of run.measurements) {
      const values = samples.get(measurement.label) ?? []
      values.push(measurement.latencyMs)
      samples.set(measurement.label, values)
    }
  }

  return globalThis.Array.from(samples, ([label, values]) => ({
    label,
    samplesMs: values,
    medianMs: globalThis.Number(median(values).toFixed(3)),
    minimumMs: globalThis.Math.min(...values),
    maximumMs: globalThis.Math.max(...values),
  }))
}

const selectedScenarios = async (
  options: Options,
): Promise<ReadonlyArray<ScenarioResult>> => {
  if (options.scenario === 'message-constructors') {
    return [
      await messageConstructorScenario(options.timeoutMs, 'local'),
      await messageConstructorScenario(options.timeoutMs, 'completed'),
    ]
  } else if (options.scenario === 'workspace') {
    return [
      await workspaceBindingHoverScenario(options.timeoutMs),
      await workspaceBindingCompletionScenario(options.timeoutMs),
      await workspaceBlockCompletionScenario(options.timeoutMs),
      await workspaceTitleWorkflowScenario(options.timeoutMs),
    ]
  } else {
    return [
      await hoverScenario(options.timeoutMs),
      await definitionScenario(options.timeoutMs),
      await completionScenario(options.timeoutMs),
      await bindingCompletionScenario(options.timeoutMs),
      await changedUrlWorkflowScenario(options.timeoutMs),
      await messageConstructorScenario(options.timeoutMs, 'local'),
      await messageConstructorScenario(options.timeoutMs, 'completed'),
    ]
  }
}

const documentChangeMode = (scenario: Options['scenario']): string => {
  if (scenario === 'message-constructors') {
    return 'One fresh document per cold constructor scenario; no edits'
  } else if (scenario === 'workspace') {
    return 'Incremental ranges for workspace hover, completion and title diagnostics'
  } else {
    return 'Incremental ranges for Binding and changed URL workflows'
  }
}

const main = async (): Promise<void> => {
  const options = parseOptions()
  nativeCompilerExecutable()

  const sourceCommit = gitOutput(['rev-parse', 'HEAD'])
  const sourceWorkloadDirty =
    gitOutput([
      'status',
      '--porcelain',
      '--untracked-files=all',
      '--',
      ...workloadGitPaths,
      ...(options.scenario === 'workspace' ? workspaceExampleGitPaths : []),
    ]) !== ''
  const initialWorkloadHash = workloadHash(options.scenario)
  const lockfileHash = sha256(
    readFileSync(join(workspaceRoot, 'pnpm-lock.yaml')),
  )
  const benchmarkScriptHash = sha256(readFileSync(benchmarkScriptPath))
  const typescriptVersion = compilerVersion()

  const runs: Array<
    Readonly<{
      run: number
      measurements: ReadonlyArray<Measurement>
      serverMemory?: ReadonlyArray<ServerMemory>
    }>
  > = []
  let serverInfo: ServerInfo | undefined

  for (let run = 1; run <= options.runs; run += 1) {
    const scenarios = await selectedScenarios(options)
    serverInfo ??= EffectArray.head(scenarios).pipe(
      Option.map(scenario => scenario.serverInfo),
      Option.getOrElse(() => fail(`No scenario produced server metadata.`)),
    )
    const expectedServer = serverInfo
    const scenarioInfos = scenarios.map(scenario => scenario.serverInfo)
    if (
      scenarioInfos.some(
        actual =>
          actual.name !== expectedServer.name ||
          actual.version !== typescriptVersion,
      )
    ) {
      return fail(
        `Language server identity or version changed during the benchmark.`,
      )
    }

    runs.push({
      run,
      measurements: scenarios.flatMap(scenario => scenario.measurements),
      ...(options.scenario === 'workspace'
        ? {
            serverMemory: scenarios.map(
              scenario =>
                scenario.serverMemory ??
                fail('Workspace scenario has no server memory measurements.'),
            ),
          }
        : {}),
    })
  }

  if (workloadHash(options.scenario) !== initialWorkloadHash) {
    return fail(`The measured source or declarations changed during the run.`)
  }
  if (sha256(readFileSync(benchmarkScriptPath)) !== benchmarkScriptHash) {
    return fail(`The benchmark script changed during the run.`)
  }

  const output = {
    metadata: {
      formatVersion: 5,
      measuredAt: new Date().toISOString(),
      sourceCommit,
      sourceWorkloadDirty,
      workloadSha256: initialWorkloadHash,
      lockfileSha256: lockfileHash,
      benchmarkScriptSha256: benchmarkScriptHash,
      compilerPackageVersion: typescriptVersion,
      nativeCompilerPackage,
      server: serverInfo ?? fail(`The benchmark produced no server metadata.`),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      runs: options.runs,
      scenario: options.scenario,
      timeoutMs: options.timeoutMs,
      completionSnippetSupport: true,
      documentChangeMode: documentChangeMode(options.scenario),
    },
    workload: {
      ...(options.scenario === 'all'
        ? {
            hoverFirst: `${definitionPath}#ApplicationDefinition`,
            hoverAfterEdit: `${compositionPath}#SearchBinding`,
            definitionFirst: `${compositionPath}#${bindingFactoryMarker(
              readFileSync(join(workspaceRoot, compositionPath), 'utf8'),
            )}`,
            completion: `${changedUrlPath}#previousRoute.`,
            bindingCompletion: `${changedUrlPath}#SearchBinding.|informRouteChanged()`,
            changedUrlHover: `${changedUrlPath}#SearchBinding at informRouteChanged()`,
            bindingHoverValidation: searchBindingHover,
            changedUrlDiagnostics: {
              source: changedUrlPath,
              edit: 'route: () => nextRoute becomes route: () => 1709, then restores nextRoute',
              expectedErrorCode: routeErrorCode,
              mode: 'Full pull diagnostics without previousResultId',
            },
          }
        : {}),
      ...(options.scenario === 'workspace'
        ? {
            workspace: {
              bindingHover: `${workspaceCompositionPath}#IssueDetailBinding`,
              bindingHoverValidation: workspaceBindingHover,
              bindingCompletion: `${workspaceUpdatePath}#appended in-memory IssueDetailBinding.|init probe`,
              expectedBindingMembers: ['requestSave', 'embedView', 'init'],
              blockCompletion: `${workspaceEntryPath}#ApplicationBlock.|Message.ClickedLink`,
              expectedBlockMembers: [
                'Model',
                'Message',
                'init',
                'makeView',
                'replaceEffectsLayer',
              ],
              titleDiagnostics: {
                source: workspaceDetailUpdatePath,
                edit: `${workspaceTitleWriter} becomes title: () => ${workspaceInvalidTitle}, then restores value`,
                expectedErrorCode: routeErrorCode,
                expectedErrorProperty: 'title',
                mode: 'Full pull diagnostics without previousResultId',
              },
              serverMemory: {
                method: 'ps -o rss= -p <pid>',
                unit: 'KiB',
                samplingIntervalMs: serverMemorySamplingIntervalMs,
                sampleTimeoutMs: serverMemorySampleTimeoutMs,
                supportedPlatforms: ['darwin', 'linux'],
              },
            },
          }
        : {
            messageConstructorDiagnostics: {
              source: 'packages/website/src/entry.ts',
              local: messageConstructorSource('local'),
              completed: messageConstructorSource('completed'),
              mode: 'One cold full pull diagnostic request per fresh server',
            },
          }),
    },
    summary: summarize(runs),
    runs,
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
}

const maybeScriptPath = EffectArray.head(process.argv.slice(1))
const isMain = Option.match(maybeScriptPath, {
  onNone: () => false,
  onSome: scriptPath => fileURLToPath(import.meta.url) === resolve(scriptPath),
})

if (isMain) {
  main().catch(error => {
    const message =
      error instanceof Error ? error.message : globalThis.String(error)
    process.stderr.write(
      `[block-language-service] ${message.replaceAll(workspaceRoot, '<workspace>')}\n`,
    )
    process.exitCode = 1
  })
}
