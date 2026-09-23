import { Schema } from 'effect'
import type { RenderedApplication } from 'foldkit/experimental/server'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
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
   * The origin used for `Request.url` while generating, such as
   * `'https://app.example'`. This option does not set canonical or Open Graph
   * metadata. It affects those fields only when the server entry derives them
   * from `Request.url`, in which case it should match the published origin.
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
 * What an `ssr.build` build produced, written beside the server bundle.
 *
 * An SSR host serves generated paths as files and sends requests without a
 * matching file to the server entry. A static-only SSG host serves the files
 * and leaves other paths as misses.
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
})

/**
 * The decoded shape of `foldkit.build.json`.
 *
 * A deployment host decodes the manifest before using it. The Schema rejects
 * unknown versions rather than letting the host read missing fields.
 */
export type FoldkitBuildManifest = typeof FoldkitBuildManifest.Type

/** Completed application build data for an in-process deployment integration. */
export const FoldkitBuildMetadata = Schema.Struct({
  /** Absolute resolved Vite application root. */
  root: Schema.String,
  /** Absolute resolved browser output directory. */
  clientDirectory: Schema.String,
  /** Absolute resolved server output directory. */
  serverDirectory: Schema.String,
  /** Absolute path to the emitted fetch handler. */
  serverEntry: Schema.String,
  /** Portable data also written to `foldkit.build.json`. */
  manifest: FoldkitBuildManifest,
})

/** The serializable, frozen snapshot of a completed Foldkit build. */
export type FoldkitBuildMetadata = typeof FoldkitBuildMetadata.Type

/** The `foldkit:build` plugin's public integration API. */
export type FoldkitBuildApi = Readonly<{
  /** Configured application source entry. */
  serverEntry: string
  /** Virtual module used to bundle the fetch handler. */
  fetchModuleId: typeof FOLDKIT_FETCH_MODULE_ID
  /**
   * Read after a successful `await builder.buildApp()`. Throws before Foldkit
   * finalizes or after another client or server build starts. Later plugin failures
   * still require callers to await the full build successfully.
   */
  getBuildMetadata: () => FoldkitBuildMetadata
}>

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
const TEMPLATE_FILE_NAME = 'index.html'
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

const fetchModuleSource = (
  serverEntry: string,
  template: string,
  containerId: string | undefined,
): string => {
  const containerLiteral =
    containerId === undefined ? 'undefined' : JSON.stringify(containerId)
  // NOTE: `export *` re-exports whatever the application entry actually names,
  // so a missing `prerenderPaths` is absent rather than a Vite undefined-import
  // warning.
  return `${[
    `import { handleRequest } from 'foldkit/experimental/server'`,
    `import * as server from ${JSON.stringify(serverEntry)}`,
    `export * from ${JSON.stringify(serverEntry)}`,
    `const template = ${JSON.stringify(template)}`,
    `const containerId = ${containerLiteral}`,
    `export default {`,
    `  fetch(request) {`,
    `    return handleRequest(request, {`,
    `      renderPage: server.renderPage,`,
    `      template,`,
    `      containerId,`,
    `    })`,
    `  },`,
    `}`,
    ``,
  ].join('\n')}`
}

// The template is what the browser build emitted in this same `vite build`,
// never a file on disk: `dist/client/index.html` could only be the previous
// build's shell with its old asset hashes, and the source `index.html` still
// names `/src/entry.ts`. Either would bundle into a handler that serves a
// page which cannot hydrate, from a build that reported success.
const templateForFetchModule = (
  capturedTemplate: string | undefined,
): string => {
  if (capturedTemplate === undefined) {
    throw new Error(
      `[foldkit] the browser build has not emitted ${TEMPLATE_FILE_NAME}, so the fetch handler has no template to render into. Build the "client" environment before "ssr", and give the client an HTML entry.`,
    )
  }
  return capturedTemplate
}

/**
 * Builds a Web `fetch` handler alongside the browser build, and generates
 * static HTML from the server entry, inside one `vite build`.
 *
 * Vite builds both environments, so a deployment target that runs `vite build`
 * gets the browser and server bundles. The `fetch` handler and generated pages
 * use the HTML emitted by the browser build, but the unrendered template is not
 * published with the assets. The server bundle's default export is `{ fetch }`.
 */
export const foldkitBuild = (
  serverEntry: string,
  options: FoldkitBuildOptions = {},
): Plugin<FoldkitBuildApi> => {
  const state: Captured = {}
  let metadata: FoldkitBuildMetadata | undefined

  const clientOutDir = options.clientOutDir ?? DEFAULT_CLIENT_OUT_DIR
  const serverOutDir = options.serverOutDir ?? DEFAULT_SERVER_OUT_DIR
  const prerender = prerenderOptionsFrom(options.prerender ?? false)
  const containerId = prerender?.containerId ?? options.containerId

  // Prerendering imports the server bundle and runs it in the build process,
  // with the build's own privileges. That module is the application's own code
  // and its dependencies, built from the configured entry, and is trusted on
  // exactly those terms. Nothing here is imported when prerendering is off.
  const generatePages = async (
    builder: ViteBuilder,
    template: () => string,
    clientDirectory: string,
    serverDirectory: string,
    entryFileName: string,
  ): Promise<ReadonlyArray<string>> => {
    if (prerender === undefined) {
      return []
    }

    const origin = prerender.origin ?? DEFAULT_PRERENDER_ORIGIN

    const entryFile = resolve(serverDirectory, entryFileName)
    const contained = resolve(serverDirectory)
    if (!entryFile.startsWith(`${contained}${nodePath.sep}`)) {
      throw new Error(
        `[foldkit] the server entry "${entryFileName}" resolves outside the server build at "${contained}".`,
      )
    }

    const entryUrl = pathToFileURL(entryFile)
    entryUrl.searchParams.set('foldkit-build', randomUUID())
    const entry: ServerEntryModule = await import(entryUrl.href)
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

  const finalize = async (builder: ViteBuilder): Promise<void> => {
    metadata = undefined

    const client = environmentNamed(builder, 'client')
    const server = environmentNamed(builder, 'ssr')
    const clientDirectory = resolve(
      client.config.root,
      client.config.build.outDir,
    )
    const serverDirectory = resolve(
      server.config.root,
      server.config.build.outDir,
    )

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
          `[foldkit] the browser build emitted no ${TEMPLATE_FILE_NAME} to generate pages from. Prerendering needs an HTML entry.`,
        )
      }
      return state.template
    }

    const prerendered = await generatePages(
      builder,
      template,
      clientDirectory,
      serverDirectory,
      state.serverEntryFile,
    )

    const manifest = FoldkitBuildManifest.make({
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      client: manifestPath(builder.config.root, clientDirectory),
      server: manifestPath(builder.config.root, serverDirectory),
      serverEntry: state.serverEntryFile,
      prerendered: [...prerendered],
    })

    await writeFile(
      resolve(serverDirectory, MANIFEST_FILE_NAME),
      `${JSON.stringify(Schema.encodeSync(FoldkitBuildManifest)(manifest), undefined, 2)}\n`,
    )
    builder.config.logger.info(`  wrote ${MANIFEST_FILE_NAME}`)

    const completedMetadata = FoldkitBuildMetadata.make({
      root: builder.config.root,
      clientDirectory,
      serverDirectory,
      serverEntry: resolve(serverDirectory, state.serverEntryFile),
      manifest,
    })
    Object.freeze(completedMetadata.manifest.prerendered)
    Object.freeze(completedMetadata.manifest)
    metadata = Object.freeze(completedMetadata)
  }

  return {
    name: 'foldkit:build',
    apply: 'build',
    sharedDuringBuild: true,
    api: {
      serverEntry,
      fetchModuleId: FOLDKIT_FETCH_MODULE_ID,
      getBuildMetadata: () => {
        if (metadata === undefined) {
          throw new Error(
            '[foldkit] build metadata is not available. Read it after a successful builder.buildApp().',
          )
        }

        return metadata
      },
    },
    buildStart: {
      order: 'pre',
      handler() {
        if (this.environment.name === 'client') {
          delete state.template
          delete state.serverEntryFile
          metadata = undefined
        } else if (this.environment.name === 'ssr') {
          delete state.serverEntryFile
          metadata = undefined
        }
      },
    },
    resolveId(id) {
      if (id === FOLDKIT_FETCH_MODULE_ID) {
        return RESOLVED_FETCH_MODULE_ID
      }
      return undefined
    },
    load(id) {
      if (id !== RESOLVED_FETCH_MODULE_ID) {
        return
      }
      const template = templateForFetchModule(state.template)
      return fetchModuleSource(serverEntry, template, containerId)
    },
    // NOTE: `order: 'post'` because Vite's own HTML plugin emits `index.html`
    // from a `generateBundle` of its own; post is guaranteed to run after it.
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        if (this.environment.name === 'ssr') {
          state.serverEntryFile = serverEntryFile(
            Object.values(bundle),
            FETCH_CHUNK_NAME,
          )
          return
        }
        if (this.environment.name !== 'client') {
          return
        }
        const html = bundle[TEMPLATE_FILE_NAME]
        if (html === undefined || html.type !== 'asset') {
          return
        }
        state.template = String(html.source)
        delete bundle[TEMPLATE_FILE_NAME]
      },
    },
    config: userConfig => {
      const client: EnvironmentOptions = {
        build: { outDir: clientOutDir },
      }
      const ssr: EnvironmentOptions = {
        build: {
          ssr: true,
          outDir: serverOutDir,
          rolldownOptions: {
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
