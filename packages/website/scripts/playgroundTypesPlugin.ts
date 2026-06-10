import { Array, Record } from 'effect'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

import { exampleSlugs } from '../src/page/example/meta'

const SCRIPT_DIRECTORY = resolve(fileURLToPath(import.meta.url), '..')
const WEBSITE_ROOT = resolve(SCRIPT_DIRECTORY, '..')
const REPO_ROOT = resolve(WEBSITE_ROOT, '../..')

const VIRTUAL_MODULE_ID = 'virtual:playground-types'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

// NOTE: Monaco's TypeScript service is configured with Bundler module
// resolution, which honors `package.json` `exports`. We still mirror
// each package's declaration tree under `/node_modules/<pkg>/...` and
// emit barrel files at the subpath locations declared in `exports`, so
// `import 'foldkit/html'` resolves to the *public* API (not whatever
// dist happens to live at `index.d.ts`). The walk is scoped to
// directories referenced by `exports`/`types` so source `.ts` files and
// ambient `.d.ts` files in `src/` don't leak into the type environment.
type TypeFile = Readonly<{ path: string; contents: string }>

type PackageJsonExportEntry =
  | string
  | Readonly<{
      types?: string
      import?: string
      require?: string
      default?: string
    }>

type PackageJson = Readonly<{
  exports?: Readonly<Record<string, PackageJsonExportEntry | null>>
  types?: string
  typings?: string
  main?: string
}>

// NOTE: Deliberately only `.d.ts`. `.d.mts` and `.d.cts` are not
// matched. Today every example dependency ships a `.d.ts` companion, so
// types resolve fine. If a future ESM-only-typed dep ships only `.d.mts`,
// it would silently produce no types in the playground; broaden this
// predicate then.
const isDeclarationFile = (name: string): boolean => name.endsWith('.d.ts')

const collectFilePaths = async (
  directory: string,
  predicate: (name: string) => boolean,
): Promise<ReadonlyArray<string>> => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter(entry => entry.isFile() && predicate(entry.name))
    .map(entry => join(entry.parentPath, entry.name))
}

// NOTE: Returns the package-relative directories that hold the `.d.ts`
// files referenced by `package.json` `exports`/`types`. Walking just
// these (vs the entire package root) keeps the type payload scoped to
// what consumers can actually reach, and prevents ambient `.d.ts` files
// that live alongside source from polluting the playground's type
// environment.
const declarationDirectoriesFor = (
  packageJson: PackageJson,
): ReadonlyArray<string> => {
  const directories = new Set<string>()
  const addDirectoryFor = (target: string): void => {
    const stripped = target.replace(/^\.\//, '')
    const segments = stripped.split('/')
    const directorySegments: Array<string> = []
    for (const segment of segments) {
      if (segment.includes('*')) {
        break
      }
      directorySegments.push(segment)
    }
    if (directorySegments.length === segments.length) {
      directorySegments.pop()
    }
    directories.add(directorySegments.join('/') || '.')
  }
  for (const entry of Object.values(packageJson.exports ?? {})) {
    const target = resolveTypesEntry(entry)
    if (target !== undefined) {
      addDirectoryFor(target)
    }
  }
  for (const fallback of [packageJson.types, packageJson.typings]) {
    if (fallback !== undefined) {
      addDirectoryFor(fallback)
    }
  }
  if (directories.size === 0) {
    directories.add('.')
  }
  return Array.fromIterable(directories)
}

const resolveTypesEntry = (entry: unknown): string | undefined => {
  if (entry === null || entry === undefined) {
    return undefined
  }
  if (typeof entry === 'string') {
    if (entry.endsWith('.d.ts')) {
      return entry
    }
    if (entry.endsWith('.js')) {
      return entry.slice(0, -'.js'.length) + '.d.ts'
    }
    return undefined
  }
  if (Array.isArray(entry)) {
    for (const candidate of entry) {
      const resolved = resolveTypesEntry(candidate)
      if (resolved !== undefined) {
        return resolved
      }
    }
    return undefined
  }
  if (typeof entry === 'object') {
    const record: Record<string, unknown> = Object.fromEntries(
      Object.entries(entry),
    )
    return resolveTypesEntry(
      record['types'] ??
        record['default'] ??
        record['import'] ??
        record['require'],
    )
  }
  return undefined
}

// NOTE: ESM `.js` imports map to `.d.ts` files for type resolution. We
// emit `.js` here (not `.d.ts` and not extension-less) because Monaco's
// Bundler resolver only auto-tries extensions for some paths; the `.js`
// → `.d.ts` mapping is the universally-supported form.
const dtsTargetToJsImport = (relativePath: string): string =>
  relativePath.endsWith('.d.ts')
    ? relativePath.slice(0, -'.d.ts'.length) + '.js'
    : relativePath

const computeRelativeImport = (fromPath: string, toPath: string): string => {
  const fromDirectory = dirname(fromPath)
  const raw = relative(fromDirectory, dtsTargetToJsImport(toPath))
  const prefixed = raw.startsWith('.') ? raw : `./${raw}`
  return prefixed
}

const collectPackageTypes = async (
  packageRoot: string,
  packageName: string,
): Promise<ReadonlyArray<TypeFile>> => {
  const packageJsonRaw = await readFile(
    resolve(packageRoot, 'package.json'),
    'utf-8',
  )
  const packageJson: PackageJson = JSON.parse(packageJsonRaw)

  const collectedPaths: ReadonlyArray<ReadonlyArray<string>> =
    await Promise.all(
      declarationDirectoriesFor(packageJson).map(async relativeDirectory => {
        const absoluteDirectory = resolve(packageRoot, relativeDirectory)
        if (!existsSync(absoluteDirectory)) {
          return []
        }
        return collectFilePaths(absoluteDirectory, isDeclarationFile)
      }),
    )
  const distFilePaths = Array.fromIterable(new Set(collectedPaths.flat()))
  const distFiles: ReadonlyArray<TypeFile> = await Promise.all(
    distFilePaths.map(async filePath => {
      const relativePath = relative(packageRoot, filePath)
      const contents = await readFile(filePath, 'utf-8')
      return {
        path: `/node_modules/${packageName}/${relativePath}`,
        contents,
      }
    }),
  )

  const exportBarrelEntries: ReadonlyArray<readonly [string, string]> =
    Object.entries(packageJson.exports ?? {}).flatMap(([subpath, entry]) => {
      const target = resolveTypesEntry(entry)
      if (target === undefined) {
        return []
      }
      // NOTE: Handle the wildcard pattern `"./*": "./dist/*.js"` (effect
      // uses this so every top-level module is exported by its filename).
      // Expand into one barrel per actual `.d.ts` in the matching dist
      // directory.
      if (subpath.includes('*') && target.includes('*')) {
        const targetDirectory = dirname(
          resolve(packageRoot, target.replace(/^\.\//, '')),
        )
        const matchedFiles = distFilePaths.filter(
          filePath =>
            dirname(filePath) === targetDirectory && filePath.endsWith('.d.ts'),
        )
        return matchedFiles.flatMap(filePath => {
          const baseName = relative(targetDirectory, filePath).replace(
            /\.d\.ts$/,
            '',
          )
          const expandedSubpath = subpath.replace('*', baseName)
          const cleanSubpath = expandedSubpath.replace(/^\.\//, '')
          const barrelPath = `/node_modules/${packageName}/${cleanSubpath}.d.ts`
          const targetPath = `/node_modules/${packageName}/${target.replace('*', baseName).replace(/^\.\//, '')}`
          return [[barrelPath, targetPath]] as const
        })
      }
      const cleanSubpath = subpath === '.' ? '' : subpath.replace(/^\.\//, '')
      const barrelPath =
        cleanSubpath === ''
          ? `/node_modules/${packageName}/index.d.ts`
          : `/node_modules/${packageName}/${cleanSubpath}/index.d.ts`
      const targetPath = `/node_modules/${packageName}/${target.replace(/^\.\//, '')}`
      return [[barrelPath, targetPath]] as const
    })

  // NOTE: Packages that predate `exports` (e.g. `maplibre-gl`) declare
  // their entry point only through the legacy `types`/`typings` field.
  // Bundler resolution needs an `index.d.ts` at the package root to
  // resolve the bare specifier, so synthesize one from `types`/`typings`
  // when no `.` export already produced a root barrel.
  const rootBarrelPath = `/node_modules/${packageName}/index.d.ts`
  const legacyTypesTarget = resolveTypesEntry(
    packageJson.types ?? packageJson.typings,
  )
  const hasRootBarrel = exportBarrelEntries.some(
    ([barrelPath]) => barrelPath === rootBarrelPath,
  )
  const legacyBarrelEntries: ReadonlyArray<readonly [string, string]> =
    legacyTypesTarget === undefined || hasRootBarrel
      ? []
      : [
          [
            rootBarrelPath,
            `/node_modules/${packageName}/${legacyTypesTarget.replace(/^\.\//, '')}`,
          ],
        ]

  const barrelEntries: ReadonlyArray<readonly [string, string]> = [
    ...exportBarrelEntries,
    ...legacyBarrelEntries,
  ]

  // NOTE: Two cases that `export *` alone doesn't handle:
  //
  // 1. ESM default exports. `export *` excludes `default`, so packages
  //    whose entry has `export default X` need an explicit
  //    `export { default }` line or `import X from 'pkg'` resolves to the
  //    namespace instead of the callable.
  //
  // 2. `export =` modules (CommonJS-style, e.g. `clsx`). There is no way
  //    to re-export an `export =` binding via ESM syntax. The barrel must
  //    inline the target's contents at the barrel path so consumers reach
  //    `export = X` directly.
  const distFileContentsByPath = new Map(
    distFiles.map(file => [file.path, file.contents] as const),
  )
  const targetHasDefaultExport = (targetPath: string): boolean => {
    const contents = distFileContentsByPath.get(targetPath)
    if (contents === undefined) {
      return false
    }
    return /(^|\n)\s*export\s+default\b/.test(contents)
  }
  const targetIsExportEquals = (targetPath: string): boolean => {
    const contents = distFileContentsByPath.get(targetPath)
    if (contents === undefined) {
      return false
    }
    return /(^|\n)\s*export\s*=/.test(contents)
  }

  const barrelFiles: ReadonlyArray<TypeFile> = barrelEntries.map(
    ([barrelPath, targetPath]) => {
      if (targetIsExportEquals(targetPath)) {
        const targetContents = distFileContentsByPath.get(targetPath)
        if (targetContents !== undefined) {
          return { path: barrelPath, contents: targetContents }
        }
      }
      const importPath = computeRelativeImport(barrelPath, targetPath)
      const lines = [`export * from '${importPath}'`]
      if (targetHasDefaultExport(targetPath)) {
        lines.push(`export { default } from '${importPath}'`)
      }
      return { path: barrelPath, contents: lines.join('\n') + '\n' }
    },
  )

  // NOTE: Barrel files may collide with real files in dist (e.g. when
  // dist already has an `index.d.ts` at the package root). The barrel
  // takes precedence so that `package.json.exports` semantics win over
  // whatever shape the dist happens to have.
  const merged: Record<string, TypeFile> = {}
  for (const file of distFiles) {
    merged[file.path] = file
  }
  for (const file of barrelFiles) {
    merged[file.path] = file
  }
  return Record.values(merged)
}

// NOTE: pnpm symlinks each example's direct dependencies into that
// example's own `node_modules`, pointing into the shared store. We
// resolve types from there rather than the website's `node_modules` so
// that example-only deps the website never imports (e.g. `maplibre-gl`)
// still resolve in the editor. `foldkit` is excluded because its types
// come from the monorepo source. Names are deduped across examples; the
// first example that declares a dependency wins.
const collectExampleDependencyRoots = async (): Promise<
  ReadonlyArray<readonly [string, string]>
> => {
  const rootByName = new Map<string, string>()
  for (const slug of exampleSlugs) {
    const exampleRoot = resolve(REPO_ROOT, 'examples', slug)
    const packageJsonPath = resolve(exampleRoot, 'package.json')
    if (!existsSync(packageJsonPath)) {
      continue
    }
    const packageJsonRaw = await readFile(packageJsonPath, 'utf-8')
    const examplePackageJson: Readonly<{
      dependencies?: Readonly<Record<string, string>>
    }> = JSON.parse(packageJsonRaw)
    for (const name of Object.keys(examplePackageJson.dependencies ?? {})) {
      if (name === 'foldkit' || rootByName.has(name)) {
        continue
      }
      const packageRoot = resolve(exampleRoot, 'node_modules', name)
      if (existsSync(packageRoot)) {
        rootByName.set(name, packageRoot)
      }
    }
  }
  return Array.fromIterable(rootByName)
}

export const playgroundTypesPlugin = (): Plugin => ({
  name: 'playground-types',
  resolveId(id) {
    if (id === VIRTUAL_MODULE_ID) {
      return RESOLVED_VIRTUAL_MODULE_ID
    }
    return undefined
  },
  async load(id) {
    if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
      return undefined
    }

    // NOTE: Foldkit is a workspace package and is read from the monorepo
    // source. Every other dependency is resolved from the example that
    // declares it, which lets us bundle types for whatever packages the
    // examples currently use without enumerating them in the website's
    // own dependencies.
    const foldkit = await collectPackageTypes(
      resolve(REPO_ROOT, 'packages/foldkit'),
      'foldkit',
    )

    const externalPackageRoots = await collectExampleDependencyRoots()
    const externalPackages = await Promise.all(
      externalPackageRoots.map(([name, packageRoot]) =>
        collectPackageTypes(packageRoot, name),
      ),
    )

    const allFiles = Array.flatten([foldkit, ...externalPackages])
    return `export default ${JSON.stringify(allFiles)}`
  },
})
