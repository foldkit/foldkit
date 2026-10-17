import {
  Cause,
  Effect,
  Record as EffectRecord,
  Exit,
  Layer,
  Option,
  Predicate,
  Ref,
  pipe,
} from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as SchemaAOTCompilerBuild from 'effect/unstable/schema/SchemaAOTCompiler/Build'
import { join, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  type Environment,
  type Plugin,
  type ResolvedConfig,
  type ViteDevServer,
  createServer,
} from 'vite'

import * as NodePath from '@effect/platform-node/NodePath'

/** A Schema parser operation that the ahead-of-time compiler can prepare. */
export type SchemaCompilerOperation = SchemaAOTCompilerBuild.Operation

/** Options for compiling Schema parsers ahead of time in `vite build`. */
export type FoldkitSchemaCompilerOptions = Readonly<{
  /**
   * The modules whose exported Schemas are compiled, as Vite import paths
   * such as `'/src/schema/api.ts'`. They resolve like an import in the
   * project, so aliases apply. Only direct Schema exports are roots. The
   * Schemas they reference are compiled with them.
   *
   * The build imports these modules in Node through Vite's SSR module runner,
   * with the project's resolve settings and without its plugins. They must not
   * touch the DOM or start the application when imported, and they must build
   * the same Schemas there as in the browser: the compiled parsers trust the
   * Schema definitions they were built from, so a Schema that branches on
   * `import.meta.env.SSR` or `typeof window` decodes browser data against the
   * wrong definition.
   */
  modules: ReadonlyArray<string>
  /**
   * The parser operations to prepare. Defaults to `['decode']`. Add `'encode'`
   * for `Schema.encode*`, `'is'` for `Schema.is`, and `'make'` for Schema
   * constructors.
   */
  operations?: ReadonlyArray<SchemaCompilerOperation>
}>

/**
 * The module that installs the compiled parsers. The plugin imports it ahead
 * of the entry in every HTML page. A client build without an HTML entry
 * imports it first in its entry module instead. The dev server and server
 * builds resolve it to an empty module.
 */
export const FOLDKIT_SCHEMA_COMPILER_MODULE_ID =
  'virtual:foldkit/schema-compiler'

// NOTE: the generated module imports the listed modules by relative path and
// `effect` by bare specifier, and both resolve from the importing module's
// location. Placing its id in the project root makes both resolve the way
// they would from application source, without writing a file there.
const GENERATED_MODULE_FILE_NAME = '__foldkit_schema_compiler.js'

type GeneratedModule = Readonly<{
  source: string
  schemaCount: number
  moduleCount: number
}>

const withLoaderServer = <A, E, R>(
  config: ResolvedConfig,
  use: (server: ViteDevServer) => Effect.Effect<A, E, R>,
) =>
  Effect.acquireUseRelease(
    Effect.promise(() =>
      createServer({
        configFile: false,
        root: config.root,
        mode: config.mode,
        envDir: config.envDir,
        ...(config.envPrefix === undefined
          ? {}
          : { envPrefix: config.envPrefix }),
        ...(config.define === undefined ? {} : { define: config.define }),
        resolve: {
          alias: config.resolve.alias,
          dedupe: config.resolve.dedupe,
          extensions: config.resolve.extensions,
          preserveSymlinks: config.resolve.preserveSymlinks,
          tsconfigPaths: config.resolve.tsconfigPaths,
        },
        logLevel: 'silent',
        appType: 'custom',
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      }),
    ),
    use,
    server => Effect.promise(() => server.close()),
  )

const generateSchemaCompilerModule = (
  config: ResolvedConfig,
  moduleIdByKey: Readonly<Record<string, string>>,
  operations: FoldkitSchemaCompilerOptions['operations'],
  generatedModuleId: string,
) =>
  Effect.gen(function* () {
    const maybeSource = yield* Ref.make(Option.none<string>())
    const capturingFileSystem = FileSystem.layerNoop({
      makeDirectory: () => Effect.void,
      writeFileString: (_path, source) =>
        Ref.set(maybeSource, Option.some(source)),
    })

    const result = yield* withLoaderServer(config, server =>
      SchemaAOTCompilerBuild.build({
        modules: EffectRecord.map(
          moduleIdByKey,
          moduleId => () => server.ssrLoadModule(moduleId),
        ),
        baseUrl: pathToFileURL(`${config.root}${sep}`),
        outFile: generatedModuleId,
        operations,
      }),
    ).pipe(Effect.provide(Layer.merge(capturingFileSystem, NodePath.layer)))

    const source = yield* Effect.fromOption(yield* Ref.get(maybeSource))
    const generated: GeneratedModule = {
      source,
      schemaCount: result.schemas,
      moduleCount: result.modules,
    }
    return generated
  })

const messageOf = (value: unknown): string => {
  if (Predicate.isError(value)) {
    return value.message
  } else {
    return globalThis.String(value)
  }
}

const describeFailure = (
  failure: unknown,
  modulePathByKey: Readonly<Record<string, string>>,
): string => {
  if (!(failure instanceof SchemaAOTCompilerBuild.BuildError)) {
    return messageOf(failure)
  }

  const message = pipe(
    Option.fromNullishOr(failure.module),
    Option.flatMap(key =>
      Option.map(EffectRecord.get(modulePathByKey, key), modulePath =>
        failure.message.replace(
          JSON.stringify(key),
          JSON.stringify(modulePath),
        ),
      ),
    ),
    Option.getOrElse(() => failure.message),
  )

  if (failure.cause === undefined) {
    return message
  } else {
    return `${message}: ${messageOf(failure.cause)}`
  }
}

const underlyingCause = (failure: unknown): unknown => {
  if (
    failure instanceof SchemaAOTCompilerBuild.BuildError &&
    failure.cause !== undefined
  ) {
    return failure.cause
  } else {
    return failure
  }
}

const generatedModuleIdFor = (root: string): string =>
  join(root, GENERATED_MODULE_FILE_NAME)

const isClientBuild = (environment: Environment): boolean =>
  environment.mode === 'build' && environment.config.consumer === 'client'

/**
 * Compiles the Schemas exported by `options.modules` into static parsers
 * during `vite build`, and installs them in the browser before the
 * application's entry runs. Schema parsers that have a compiled entry skip
 * the interpreter. Everything else keeps interpreting.
 *
 * The development server and server builds are unaffected. In them,
 * `virtual:foldkit/schema-compiler` resolves to an empty module.
 */
export const foldkitSchemaCompiler = (
  options: FoldkitSchemaCompilerOptions,
): Array<Plugin> => {
  let maybeGenerated: Option.Option<GeneratedModule> = Option.none()
  let isInstalled = false

  const modulePlugin: Plugin = {
    name: 'foldkit:schema-compiler-module',
    resolveId(id) {
      if (id === FOLDKIT_SCHEMA_COMPILER_MODULE_ID) {
        return generatedModuleIdFor(this.environment.config.root)
      } else {
        return undefined
      }
    },
    load(id) {
      if (id !== generatedModuleIdFor(this.environment.config.root)) {
        return undefined
      }

      if (!isClientBuild(this.environment)) {
        return ''
      }

      isInstalled = true
      return Option.match(maybeGenerated, {
        onNone: () => '',
        onSome: ({ source }) => source,
      })
    },
  }

  const compilePlugin: Plugin = {
    name: 'foldkit:schema-compiler',
    apply: 'build',
    buildStart: {
      async handler() {
        if (!isClientBuild(this.environment)) {
          return
        }

        maybeGenerated = Option.none()
        isInstalled = false

        const moduleIdByKey: Record<string, string> = {}
        const modulePathByKey: Record<string, string> = {}
        for (const modulePath of options.modules) {
          const resolved = await this.resolve(modulePath)
          if (resolved === null || resolved.external) {
            return this.error(
              `[foldkit] Schema compiler: could not resolve the module "${modulePath}".`,
            )
          }

          const key = pathToFileURL(resolved.id).href
          moduleIdByKey[key] = resolved.id
          modulePathByKey[key] = modulePath
        }

        const config = this.environment.getTopLevelConfig()
        const exit = await Effect.runPromiseExit(
          generateSchemaCompilerModule(
            config,
            moduleIdByKey,
            options.operations,
            generatedModuleIdFor(config.root),
          ),
        )

        if (Exit.isFailure(exit)) {
          const failure = Cause.squash(exit.cause)
          return this.error({
            message: `[foldkit] Schema compiler: ${describeFailure(failure, modulePathByKey)}`,
            cause: underlyingCause(failure),
          })
        }

        const generated = exit.value
        maybeGenerated = Option.some(generated)

        if (generated.schemaCount === 0) {
          this.warn(
            '[foldkit] Schema compiler: none of the configured modules export a Schema, so nothing was compiled.',
          )
        } else {
          config.logger.info(
            `[foldkit] Schema compiler: compiled the Schemas exported by ${options.modules.join(', ')} (${generated.schemaCount} in total)`,
          )
        }
      },
    },
    generateBundle() {
      if (
        isClientBuild(this.environment) &&
        !isInstalled &&
        Option.exists(maybeGenerated, ({ schemaCount }) => schemaCount > 0)
      ) {
        this.warn(
          `[foldkit] Schema compiler: the compiled parsers were not included in the client build, because it has no HTML entry for the plugin to add them to. Import '${FOLDKIT_SCHEMA_COMPILER_MODULE_ID}' first in the entry module.`,
        )
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `import '${FOLDKIT_SCHEMA_COMPILER_MODULE_ID}'`,
          injectTo: 'head-prepend',
        },
      ],
    },
  }

  return [modulePlugin, compilePlugin]
}
