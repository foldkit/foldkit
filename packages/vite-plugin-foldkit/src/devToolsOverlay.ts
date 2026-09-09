import { Array, Option, Record, Schema } from 'effect'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

const DEV_TOOLS_PACKAGE_NAME = '@foldkit/devtools'
const FOLDKIT_PACKAGE_NAME = 'foldkit'
const DEV_TOOLS_VITE_EXPORT = './vite'
const DEV_TOOLS_OVERLAY_MODULE_ID = 'virtual:foldkit-devtools-overlay'
const RESOLVED_DEV_TOOLS_OVERLAY_MODULE_ID = `\0${DEV_TOOLS_OVERLAY_MODULE_ID}`
const DEV_TOOLS_VITE_IMPORT_SPECIFIER = `${DEV_TOOLS_PACKAGE_NAME}${DEV_TOOLS_VITE_EXPORT.slice(1)}`
const DEV_TOOLS_HOST_IMPORT_SPECIFIER = 'foldkit/devtools-host'
// NOTE: Vite's dependency scan cannot discover this virtual module's imports.
// Declaring registry-installed imports before the first request avoids a
// mid-session reoptimization and page reload.
const DEV_TOOLS_OVERLAY_IMPORTS: ReadonlyArray<{
  specifier: string
  packageName: string
}> = [
  {
    specifier: DEV_TOOLS_VITE_IMPORT_SPECIFIER,
    packageName: DEV_TOOLS_PACKAGE_NAME,
  },
  {
    specifier: DEV_TOOLS_HOST_IMPORT_SPECIFIER,
    packageName: FOLDKIT_PACKAGE_NAME,
  },
]
const DEV_TOOLS_OVERLAY_MODULE_SOURCE = `
import { overlay } from '${DEV_TOOLS_VITE_IMPORT_SPECIFIER}'
import { __setDevToolsOverlay } from '${DEV_TOOLS_HOST_IMPORT_SPECIFIER}'

__setDevToolsOverlay(overlay)
`

const ApplicationPackageJson = Schema.Struct({
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})

const DevToolsPackageJson = Schema.Struct({
  exports: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
})

const decodeApplicationPackageJson = Schema.decodeUnknownSync(
  ApplicationPackageJson,
)
const decodeDevToolsPackageJson = Schema.decodeUnknownSync(DevToolsPackageJson)

const readPackageJson = <A>(
  decode: (raw: unknown) => A,
  packageJsonPath: string,
): Option.Option<A> => {
  try {
    return Option.some(
      decode(JSON.parse(readFileSync(packageJsonPath, 'utf8'))),
    )
  } catch {
    return Option.none()
  }
}

const findDirectoryUpward = (
  directory: string,
  isMatch: (directory: string) => boolean,
): Option.Option<string> => {
  if (isMatch(directory)) {
    return Option.some(directory)
  } else {
    const parent = dirname(directory)
    if (parent === directory) {
      return Option.none()
    } else {
      return findDirectoryUpward(parent, isMatch)
    }
  }
}

// NOTE: `require.resolve` is not usable here. `@foldkit/devtools` is ESM-only
// and declares no `require` condition, so resolution throws even when the
// package is installed, and `resolve.paths` appends this module's own lookup
// chain, which under pnpm includes the hoisted virtual store. Both would make
// the answer depend on something other than what the application installed.
const installedPackageJsonPath = (
  directory: string,
  packageName: string,
): string => join(directory, 'node_modules', packageName, 'package.json')

const findInstalledPackageJsonPath = (
  root: string,
  packageName: string,
): Option.Option<string> =>
  findDirectoryUpward(resolve(root), directory =>
    existsSync(installedPackageJsonPath(directory, packageName)),
  ).pipe(
    Option.map(directory => installedPackageJsonPath(directory, packageName)),
  )

const findDevToolsPackageJsonPath = (root: string): Option.Option<string> =>
  findInstalledPackageJsonPath(root, DEV_TOOLS_PACKAGE_NAME)

// NOTE: the virtual module imports `@foldkit/devtools/vite` statically, so an
// installed copy that predates that export point would fail the build rather
// than quietly skip the overlay. Injecting only when the export exists lets
// the two packages be upgraded in either order.
const hasDevToolsViteExport = (root: string): boolean =>
  findDevToolsPackageJsonPath(root).pipe(
    Option.flatMap(packageJsonPath =>
      readPackageJson(decodeDevToolsPackageJson, packageJsonPath),
    ),
    Option.flatMapNullishOr(packageJson => packageJson.exports),
    Option.exists(Record.has(DEV_TOOLS_VITE_EXPORT)),
  )

// NOTE: Vite's `root` is where `index.html` lives, which is not always the
// package directory (an app may serve from a subdirectory). Walking up to the
// nearest manifest keeps dependency placement meaningful for those layouts.
const applicationPackageJsonPath = (directory: string): string =>
  join(directory, 'package.json')

const findApplicationPackageJsonPath = (root: string): Option.Option<string> =>
  findDirectoryUpward(resolve(root), directory =>
    existsSync(applicationPackageJsonPath(directory)),
  ).pipe(Option.map(applicationPackageJsonPath))

const resolvePackageDirectory = Option.liftThrowable(
  (packageJsonPath: string) => realpathSync(dirname(packageJsonPath)),
)

// NOTE: Vite serves linked packages from source rather than pre-bundling them.
// A registry-installed package has a real path under `node_modules`, while a
// workspace link resolves to its source checkout; force-including a link would
// cache its current source and hide edits. Each owner is checked independently
// because one package may be linked while the other is installed.
const isPackageResolvedIntoNodeModules = (
  root: string,
  packageName: string,
): boolean =>
  findInstalledPackageJsonPath(root, packageName).pipe(
    Option.flatMap(resolvePackageDirectory),
    Option.exists(packageDirectory =>
      packageDirectory.split(sep).includes('node_modules'),
    ),
  )

const isDevToolsProductionDependency = (root: string): boolean =>
  findApplicationPackageJsonPath(root).pipe(
    Option.flatMap(packageJsonPath =>
      readPackageJson(decodeApplicationPackageJson, packageJsonPath),
    ),
    Option.flatMapNullishOr(packageJson => packageJson.dependencies),
    Option.exists(Record.has(DEV_TOOLS_PACKAGE_NAME)),
  )

/**
 * Determines whether the Vite integration should include the DevTools overlay.
 * Development serves it whenever the package is installed. Production builds
 * additionally require it in regular `dependencies`, which is the opt-in that
 * keeps a development dependency out of the shipped bundle.
 */
export const shouldInjectDevToolsOverlay = (
  command: 'serve' | 'build',
  root: string,
): boolean => {
  if (!hasDevToolsViteExport(root)) {
    return false
  } else if (command === 'serve') {
    return true
  } else {
    return isDevToolsProductionDependency(root)
  }
}

/** Creates the Vite plugin that registers the appropriate DevTools overlay. */
export const devToolsOverlayPlugin = (): Plugin => {
  let isInjectionEnabled = false

  return {
    name: 'foldkit:devtools-overlay',
    config: (userConfig, environment) => {
      const root = userConfig.root ?? process.cwd()
      if (
        environment.command !== 'serve' ||
        !shouldInjectDevToolsOverlay(environment.command, root)
      ) {
        return undefined
      }

      const include = DEV_TOOLS_OVERLAY_IMPORTS.filter(({ packageName }) =>
        isPackageResolvedIntoNodeModules(root, packageName),
      ).map(({ specifier }) => specifier)

      return Array.match(include, {
        onEmpty: () => undefined,
        onNonEmpty: () => ({ optimizeDeps: { include } }),
      })
    },
    configResolved: config => {
      isInjectionEnabled = shouldInjectDevToolsOverlay(
        config.command,
        config.root,
      )
    },
    resolveId: id => {
      if (id === DEV_TOOLS_OVERLAY_MODULE_ID) {
        return RESOLVED_DEV_TOOLS_OVERLAY_MODULE_ID
      } else {
        return undefined
      }
    },
    load: id => {
      if (id === RESOLVED_DEV_TOOLS_OVERLAY_MODULE_ID) {
        return DEV_TOOLS_OVERLAY_MODULE_SOURCE
      } else {
        return undefined
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler: () => {
        if (!isInjectionEnabled) {
          return
        }

        return [
          {
            tag: 'script',
            attrs: {
              type: 'module',
            },
            children: `import '${DEV_TOOLS_OVERLAY_MODULE_ID}'`,
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
