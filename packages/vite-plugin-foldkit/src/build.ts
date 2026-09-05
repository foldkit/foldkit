import { Array, Schema } from 'effect'
import type { RenderedApplication } from 'foldkit/experimental/server'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import nodePath, { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  BuildEnvironment,
  EnvironmentOptions,
  Plugin,
  ViteBuilder,
} from 'vite'

/** How a build materializes the URLs a server entry can render. */
export type FoldkitPrerenderOptions = Readonly<{
  /**
   * The paths to generate. Defaults to the `prerenderPaths` the server entry
   * exports, so the application names its own static routes.
   */
  paths?: ReadonlyArray<string>
  /**
   * The origin the entry sees as `Request.url` while generating, such as
   * `'https://app.example'`. It reaches canonical URLs and Open Graph URLs, so
   * a deployment that publishes those should set the origin it publishes.
   */
  origin?: string
  /**
   * The `id` of the placeholder element in `index.html` the rendered markup
   * replaces. Defaults to `'root'`, and the aggregate plugin passes whatever
   * `ssr.containerId` names, so a renamed container is renamed once.
   */
  containerId?: string
}>

/** How `vite build` builds a server entry and what it generates from it. */
export type FoldkitBuildOptions = Readonly<{
  /** Where the browser build is written. */
  clientOutDir?: string
  /** Where the server build is written. */
  serverOutDir?: string
  /**
   * The origin generated pages and a locking fetch handler see as
   * `Request.url`. Generated pages default to `'http://localhost'`. The
   * fetch handler uses the platform `Request.url` unless this or `ORIGIN`
   * is set, so a Worker is not refused as off-origin.
   */
  origin?: string
  /**
   * The `id` of the empty container in `index.html` the fetch handler
   * replaces. Defaults to `'root'`. The aggregate plugin copies
   * `ssr.containerId` here.
   */
  containerId?: string
  /**
   * Generate static HTML for a set of URLs after both builds. `true` takes the
   * paths from the entry's `prerenderPaths` export.
   */
  prerender?: boolean | FoldkitPrerenderOptions
}>

/** Vite module id of the fetch handler Foldkit emits as the server entry. */
export const FOLDKIT_FETCH_MODULE_ID = 'virtual:foldkit/fetch'

/**
 * What the build produced, written beside the server bundle for whatever
 * deploys it.
 *
 * A host has to decide what the asset layer does with a request that matches no
 * file, and that answer follows from the build rather than from taste: an
 * application with generated pages and no others wants a miss to stay a miss,
 * one with a server wants a miss to reach it, and one with neither wants the
 * template. Reading it here is how a deployment target gets that right without
 * asking its user to configure it twice.
 */
export const FoldkitBuildManifest = Schema.Struct({
  /**
   * The shape of this document. A consumer decodes before reading and refuses
   * a version it does not know, so a manifest written by a newer Foldkit is a
   * clear refusal rather than a field silently read as undefined.
   */
  schemaVersion: Schema.Literals([1]),
  /**
   * Where the browser build was written, as a POSIX path relative to the Vite
   * root. Relative and normalized so a manifest survives being moved with the
   * build it describes.
   */
  client: Schema.String,
  /** Where the server build was written, on the same terms as {@link client}. */
  server: Schema.String,
  /** The server build's entry file, relative to `server`. */
  serverEntry: Schema.String,
  /** Every path this build generated a page for, in the order it generated. */
  prerendered: Schema.Array(Schema.String),
  /**
   * How a request-time host should run the server entry. Always `'fetch'`:
   * the entry is a Web `fetch` handler, not a Node process.
   */
  host: Schema.optional(Schema.Literals(['fetch'])),
})

/**
 * What the build produced, written beside the server bundle for whatever
 * deploys it.
 *
 * A host has to decide what the asset layer does with a request that matches no
 * file, and that answer follows from the build rather than from taste: an
 * application with generated pages and no others wants a miss to stay a miss,
 * one with a server wants a miss to reach it, and one with neither wants the
 * template. Reading it here is how a deployment target gets that right without
 * asking its user to configure it twice.
 *
 * It is a file on disk that something else writes the next time it builds, so a
 * consumer decodes it with this Schema and fails closed rather than trusting
 * the shape it happens to find.
 */
export type FoldkitBuildManifest = typeof FoldkitBuildManifest.Type

const MANIFEST_SCHEMA_VERSION = 1

// Relative and POSIX so the manifest describes a layout rather than this
// machine: an absolute `clientOutDir` would otherwise be published verbatim and
// break the moment the build is copied anywhere else.
//
// On Windows, `path.relative` across drives has no relative answer and returns
// the absolute destination, which is exactly the machine-specific path the
// manifest must not carry. Refused rather than recorded. `pathApi` exists so a
// test can run the Windows rules anywhere.
//
// @internal Exported for tests.
export const manifestPath = (
  root: string,
  directory: string,
  pathApi: typeof nodePath = nodePath,
): string => {
  const related = pathApi.relative(root, pathApi.resolve(root, directory))
  if (pathApi.isAbsolute(related)) {
    throw new Error(
      `[foldkit] cannot record "${directory}" in the manifest: it has no path relative to the Vite root at "${root}". Keep the output directories on the root's volume.`,
    )
  }
  return related.split(pathApi.sep).join('/')
}

const MANIFEST_FILE_NAME = 'foldkit.build.json'
const DEFAULT_CLIENT_OUT_DIR = 'dist/client'
const DEFAULT_SERVER_OUT_DIR = 'dist/server'
const DEFAULT_PRERENDER_ORIGIN = 'http://localhost'
const FETCH_CHUNK_NAME = 'fetch'
const RESOLVED_FETCH_MODULE_ID = `\0${FOLDKIT_FETCH_MODULE_ID}`

type RenderedResult = {
  readonly _tag: string
  readonly application: RenderedApplication
  readonly status?: number
  readonly headers?: unknown
}

type BuildResult = Awaited<ReturnType<ViteBuilder['build']>>
type BuildOutput = Extract<BuildResult, { output: unknown }>['output'][number]

type ServerEntryModule = {
  readonly renderPage: (request: Request) => Promise<RenderedResult>
  readonly prerenderPaths?: ReadonlyArray<string>
}

// The chunk built from the configured entry, by name rather than by position.
//
// An SSR environment can carry more than one input, and prerendering imports
// whatever this returns, which runs that module's top-level code in the build
// process. Taking the first entry chunk would execute an unrelated module that
// happens to sort first, so the chunk is matched to the entry the build was
// given and anything else is refused.
const serverEntryFile = (
  outputs: ReadonlyArray<BuildOutput>,
  entryName: string,
): string => {
  const entries = outputs.filter(file => file.type === 'chunk' && file.isEntry)
  const named = entries.filter(file => file.name === entryName)
  if (named.length === 1 && named[0] !== undefined) {
    return named[0].fileName
  }
  if (named.length > 1) {
    throw new Error(
      `[foldkit] the server build emitted more than one entry chunk named "${entryName}": ${named
        .map(file => file.fileName)
        .join(', ')}. Prerendering cannot choose between them.`,
    )
  }
  throw new Error(
    `[foldkit] the server build emitted no entry chunk named "${entryName}"${
      entries.length === 0
        ? '.'
        : `; it emitted ${entries.map(file => file.name).join(', ')}.`
    }`,
  )
}

const environmentNamed = (
  builder: ViteBuilder,
  name: 'client' | 'ssr',
): BuildEnvironment => {
  const environment = builder.environments[name]
  if (environment === undefined) {
    throw new Error(
      `[foldkit] the build declares no "${name}" environment to build.`,
    )
  }
  return environment
}

// The validated render target: the URL the entry receives and the file its
// page is written to, from one resolution — returned together so the request
// can never be built from anything the validation did not see. Rendering runs
// application code with the build's privileges and may fetch from
// `Request.url`, so validation is the trust boundary and has to come first: a
// protocol-relative path like `//169.254.169.254/x` resolves to that host, and
// handing it to the entry before refusing it would let invalid path data
// trigger side effects on the way to the error.
//
// A path reaches here from application code and may come from data, so it is
// treated as a URL rather than as a filesystem path: `path.slice(1)` is a
// relative path on POSIX but not on Windows, where `/C:/outside` is
// drive-absolute and `/D:outside` is drive-relative, and either escapes the
// build output. The segments are taken from the parsed URL, rejected if any
// still carries a separator or a dot-segment after decoding, and the resolved
// file is required to sit under the client directory.
//
// `pathApi` is the platform's `path` by default and the parameter exists so a
// test can run the Windows rules anywhere.
export const renderTargetFor = (
  clientDirectory: string,
  path: string,
  origin: string,
  pathApi: typeof nodePath = nodePath,
): Readonly<{ url: URL; file: string }> => {
  const url = new URL(path, origin)
  if (url.origin !== new URL(origin).origin || url.pathname !== path) {
    throw new Error(
      `[foldkit] cannot generate the non-normalized same-origin path "${path}".`,
    )
  }

  const segments = url.pathname.split('/').filter(segment => segment !== '')
  for (const segment of segments) {
    const decoded = decodeURIComponent(segment)
    const isTraversal = decoded === '.' || decoded === '..'
    const carriesSeparator =
      decoded.includes('/') ||
      decoded.includes('\\') ||
      decoded.includes('\u0000')
    // A colon cannot appear in a Windows path segment, and a bare `C:` is a
    // drive designator rather than a directory: `path.win32.resolve` re-anchors
    // the rest of the path onto that drive's current directory.
    const namesADrive = decoded.includes(':')
    if (isTraversal || carriesSeparator || namesADrive) {
      throw new Error(
        `[foldkit] cannot generate "${path}": the segment "${segment}" does not name a single directory.`,
      )
    }
  }

  const file = pathApi.resolve(
    clientDirectory,
    ...segments.map(segment => decodeURIComponent(segment)),
    'index.html',
  )
  const root = pathApi.resolve(clientDirectory)
  const isContained =
    file === pathApi.join(root, 'index.html') ||
    file.startsWith(root.endsWith(pathApi.sep) ? root : `${root}${pathApi.sep}`)
  if (!isContained) {
    throw new Error(
      `[foldkit] cannot generate "${path}": it resolves to "${file}", outside the browser build at "${root}".`,
    )
  }
  return { url, file }
}

// A static file is a body plus whatever headers its host adds, so a result that
// carries a redirect, a status, or headers of its own cannot be written to one.
// Refusing here keeps a redirect from being published as an ordinary page.
const renderedApplication = (
  path: string,
  result: RenderedResult,
): RenderedApplication => {
  if (result._tag === 'Responded') {
    throw new Error(
      `[foldkit] cannot write the complete Response returned while generating "${path}" to a static HTML file.`,
    )
  }
  if (result.status !== undefined && result.status !== 200) {
    throw new Error(
      `[foldkit] cannot preserve status ${result.status} while generating "${path}" as a static HTML file.`,
    )
  }
  if (result.headers !== undefined) {
    throw new Error(
      `[foldkit] cannot preserve response headers while generating "${path}" as a static HTML file.`,
    )
  }
  return result.application
}

const prerenderOptionsFrom = (
  prerender: boolean | FoldkitPrerenderOptions,
): FoldkitPrerenderOptions | undefined => {
  if (prerender === false) {
    return undefined
  }
  return prerender === true ? {} : prerender
}

type Captured = {
  template?: string
  serverEntryFile?: string
}

// Keyed by Vite root plus the output layout, so concurrent builds of different
// projects in one process never read each other's output.
//
// NOTE: the registry hangs off a global symbol rather than module scope. Vite
// re-bundles a config file for each environment it resolves, and every bundle
// is a fresh copy of this module with its own module scope, so what the client
// build recorded would be invisible to the instance that finalizes. The symbol
// is one registry for the process no matter how many copies of this module it
// loads.
const CAPTURES = Symbol.for('foldkit/vite-plugin:build-captures')

const captures = ((): Map<string, Captured> => {
  const registry = globalThis as unknown as Record<symbol, unknown>
  const existing = registry[CAPTURES]
  if (existing instanceof Map) {
    return existing as Map<string, Captured>
  }
  const fresh = new Map<string, Captured>()
  registry[CAPTURES] = fresh
  return fresh
})()

const originSource = (origin: string | undefined): ReadonlyArray<string> => {
  const fromEnv =
    'globalThis.process && globalThis.process.env && globalThis.process.env.ORIGIN'
  if (origin === undefined) {
    return [`const origin = ${fromEnv}`]
  }
  return [`const origin =`, `  (${fromEnv}) ||`, `  ${JSON.stringify(origin)}`]
}

const fetchModuleSource = (
  serverEntry: string,
  template: string,
  origin: string | undefined,
  containerId: string | undefined,
): string => {
  const containerLiteral =
    containerId === undefined ? 'undefined' : JSON.stringify(containerId)
  // NOTE: `export *` re-exports whatever the application entry actually names,
  // so a missing `prerenderPaths` is absent rather than a Vite undefined-import
  // warning. ORIGIN is read at runtime so a Node adapter can serve on a port
  // the build did not know. When the build did not name an origin, the
  // handler uses the platform `Request.url` and does not refuse Workers as
  // off-origin.
  return `${[
    `import { handleRequest } from 'foldkit/experimental/server'`,
    `import * as server from ${JSON.stringify(serverEntry)}`,
    `export * from ${JSON.stringify(serverEntry)}`,
    `const template = ${JSON.stringify(template)}`,
    ...originSource(origin),
    `export { origin }`,
    `const containerId = ${containerLiteral}`,
    `export default {`,
    `  fetch(request) {`,
    `    return handleRequest(request, {`,
    `      renderPage: server.renderPage,`,
    `      template,`,
    `      origin,`,
    `      containerId,`,
    `    })`,
    `  },`,
    `}`,
    ``,
  ].join('\n')}`
}

const templateForFetchModule = async (
  root: string,
  clientOutDir: string,
  capturedTemplate: string | undefined,
): Promise<string> => {
  if (capturedTemplate !== undefined) {
    return capturedTemplate
  }
  try {
    return await readFile(resolve(root, clientOutDir, 'index.html'), 'utf8')
  } catch {
    // NOTE: never fall back to the source `index.html`. That file still
    // names `/src/entry.ts`. A client that emitted no HTML is a build this
    // has no opinion about, so the handler gets an empty template.
    return ''
  }
}

/**
 * Builds a Web `fetch` handler alongside the browser build, and generates
 * static HTML from the server entry, inside one `vite build`.
 *
 * Vite drives both environments and every host plugin composes with them, so a
 * deployment target that runs `vite build` gets the whole application rather
 * than the browser half. The generated pages take their template from the
 * browser build's own output, so generating twice over one build produces the
 * same pages. The server bundle's default export is `{ fetch }`.
 */
export const foldkitBuild = (
  serverEntry: string,
  options: FoldkitBuildOptions = {},
): Plugin => {
  const clientOutDir = options.clientOutDir ?? DEFAULT_CLIENT_OUT_DIR
  const serverOutDir = options.serverOutDir ?? DEFAULT_SERVER_OUT_DIR
  const prerender = prerenderOptionsFrom(options.prerender ?? false)
  const fetchOrigin = options.origin ?? prerender?.origin
  const containerId = prerender?.containerId ?? options.containerId

  // Prerendering imports the server bundle and runs it in the build process,
  // with the build's own privileges. That module is the application's own code
  // and its dependencies, built from the configured entry, and is trusted on
  // exactly those terms. Nothing here is imported when prerendering is off.
  const generatePages = async (
    builder: ViteBuilder,
    template: () => string,
    serverDirectory: string,
    entryFileName: string,
  ): Promise<ReadonlyArray<string>> => {
    if (prerender === undefined) {
      return []
    }

    const origin = prerender.origin ?? DEFAULT_PRERENDER_ORIGIN
    const clientDirectory = resolve(builder.config.root, clientOutDir)

    const entryFile = resolve(serverDirectory, entryFileName)
    const contained = resolve(serverDirectory)
    if (!entryFile.startsWith(`${contained}${nodePath.sep}`)) {
      throw new Error(
        `[foldkit] the server entry "${entryFileName}" resolves outside the server build at "${contained}".`,
      )
    }

    const entry: ServerEntryModule = await import(pathToFileURL(entryFile).href)
    if (typeof entry.renderPage !== 'function') {
      throw new Error(
        `[foldkit] "${entryFileName}" exports no renderPage function, so there is nothing to generate pages with.`,
      )
    }
    const paths = prerender.paths ?? entry.prerenderPaths

    if (paths === undefined) {
      throw new Error(
        `[foldkit] cannot generate pages: "${entry}" exports no prerenderPaths and the build configured no paths.`,
      )
    }

    const { injectIntoTemplate } = await import('foldkit/experimental/server')

    for (const path of paths) {
      const { url, file } = renderTargetFor(clientDirectory, path, origin)
      const result = await entry.renderPage(new Request(url))
      const html = injectIntoTemplate(
        template(),
        renderedApplication(path, result),
        prerender.containerId === undefined
          ? undefined
          : { containerId: prerender.containerId },
      )

      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, html)
      builder.config.logger.info(`  generated ${path}`)
    }

    return paths
  }

  const writeManifest = async (
    builder: ViteBuilder,
    serverDirectory: string,
    entryFileName: string,
    prerendered: ReadonlyArray<string>,
  ): Promise<void> => {
    const manifest = Schema.encodeSync(FoldkitBuildManifest)({
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      client: manifestPath(builder.config.root, clientOutDir),
      server: manifestPath(builder.config.root, serverOutDir),
      serverEntry: entryFileName,
      prerendered,
      host: 'fetch',
    })
    await writeFile(
      resolve(serverDirectory, MANIFEST_FILE_NAME),
      `${JSON.stringify(manifest, undefined, 2)}\n`,
    )
    builder.config.logger.info(`  wrote ${MANIFEST_FILE_NAME}`)
  }

  // What each environment emitted, recorded as it is emitted.
  //
  // Vite resolves the config once per environment unless `sharedConfigBuild` is
  // on, so the plugin that finalizes is not necessarily the instance that saw a
  // given environment build. Keying the record by the output layout it
  // describes is what lets the finalizing instance read what the others
  // emitted, and what lets finalization work whether this plugin orchestrates
  // the environments or a host does.
  const key = [clientOutDir, serverOutDir, serverEntry].join('\u0000')
  const captured = (root: string): Captured => {
    const existing = captures.get(`${root}\u0000${key}`)
    if (existing !== undefined) {
      return existing
    }
    const fresh: Captured = {}
    captures.set(`${root}\u0000${key}`, fresh)
    return fresh
  }

  const finalize = async (builder: ViteBuilder): Promise<void> => {
    const state = captured(builder.config.root)
    const serverDirectory = resolve(builder.config.root, serverOutDir)

    if (state.serverEntryFile === undefined) {
      throw new Error(
        '[foldkit] the server environment produced no entry chunk, so there is nothing to deploy or generate from.',
      )
    }

    // Read only when a page is actually generated: a build that generates
    // nothing has no use for an HTML entry and must not require one.
    const template = (): string => {
      if (state.template === undefined) {
        throw new Error(
          '[foldkit] the browser build emitted no index.html to generate pages from. Prerendering needs an HTML entry.',
        )
      }
      return state.template
    }

    const prerendered = await generatePages(
      builder,
      template,
      serverDirectory,
      state.serverEntryFile,
    )

    await writeManifest(
      builder,
      serverDirectory,
      state.serverEntryFile,
      prerendered,
    )
  }

  return {
    name: 'foldkit:build',
    api: {
      host: 'fetch' as const,
      serverEntry,
      fetchModuleId: FOLDKIT_FETCH_MODULE_ID,
    },
    resolveId(id) {
      if (id === FOLDKIT_FETCH_MODULE_ID) {
        return RESOLVED_FETCH_MODULE_ID
      }
      return undefined
    },
    async load(id) {
      if (id !== RESOLVED_FETCH_MODULE_ID) {
        return
      }
      const root = this.environment.config.root
      const state = captured(root)
      const template = await templateForFetchModule(
        root,
        clientOutDir,
        state.template,
      )
      return fetchModuleSource(serverEntry, template, fetchOrigin, containerId)
    },
    // NOTE: `writeBundle` rather than `generateBundle`: Vite's own HTML plugin
    // emits `index.html` from a `generateBundle` hook of its own, and hook
    // order between plugins decides whether that asset exists yet. By
    // `writeBundle` the bundle is whatever the environment actually produced.
    writeBundle(_options, bundle) {
      const state = captured(this.environment.config.root)
      const outputs = Object.values(bundle)
      if (this.environment.name === 'client') {
        const html = Array.findFirst(
          outputs,
          file => file.type === 'asset' && file.fileName === 'index.html',
        )
        if (html._tag === 'Some' && html.value.type === 'asset') {
          state.template = String(html.value.source)
        }
        return
      }
      if (this.environment.name === 'ssr') {
        state.serverEntryFile = serverEntryFile(outputs, FETCH_CHUNK_NAME)
      }
    },
    config: userConfig => {
      const client: EnvironmentOptions = {
        build: { outDir: clientOutDir },
      }
      const ssr: EnvironmentOptions = {
        build: {
          ssr: true,
          outDir: serverOutDir,
          rollupOptions: {
            input: { [FETCH_CHUNK_NAME]: FOLDKIT_FETCH_MODULE_ID },
          },
        },
      }

      // NOTE: a host framework that orchestrates its own environments owns
      // the order they build in, and Vite's config merge keeps exactly one
      // `builder.buildApp` — whichever config hook ran last. The default
      // orchestrator is only offered when nothing else claimed the slot, and
      // finalization deliberately does not live here: wrapping the host's
      // orchestrator only works when Foldkit's config hook runs after the
      // host's, so a project that lists the plugins the other way around
      // would build and silently never finalize.
      return userConfig.builder?.buildApp === undefined
        ? {
            environments: { client, ssr },
            builder: {
              buildApp: async (builder: ViteBuilder): Promise<void> => {
                await builder.build(environmentNamed(builder, 'client'))
                await builder.build(environmentNamed(builder, 'ssr'))
              },
            },
          }
        : { environments: { client, ssr } }
    },
    // The composable finalization point. `order: 'post'` runs this after the
    // config-level orchestrator — the host's, or the default above — no matter
    // where this plugin sits in the plugin list, which a wrapped
    // `builder.buildApp` could not guarantee.
    buildApp: {
      order: 'post',
      handler: finalize,
    },
  }
}
