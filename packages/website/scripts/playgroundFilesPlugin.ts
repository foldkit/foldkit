import { Array } from 'effect'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

import { exampleSlugs } from '../src/page/example/meta'

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const WEBSITE_ROOT = resolve(SCRIPT_DIRECTORY, '..')
const EXAMPLES_DIRECTORY = resolve(WEBSITE_ROOT, '../../examples')
// NOTE: Workspace packages whose `workspace:*` specs in example package.json files
// are rewritten to the published version range before the playground installs
// them in the WebContainer. Every Foldkit package an example can depend on
// must be listed here, or its `workspace:*` spec leaks into the npm install
// and the install fails.
const WORKSPACE_PACKAGE_JSON_PATHS: Readonly<Record<string, string>> = {
  foldkit: resolve(WEBSITE_ROOT, '../foldkit/package.json'),
  '@foldkit/ui': resolve(WEBSITE_ROOT, '../ui/package.json'),
  '@foldkit/devtools': resolve(WEBSITE_ROOT, '../devtools/package.json'),
  '@foldkit/vite-plugin': resolve(
    WEBSITE_ROOT,
    '../vite-plugin-foldkit/package.json',
  ),
}
const TS_CONFIG_BASE_PATH = resolve(WEBSITE_ROOT, '../../tsconfig.base.json')

const VIRTUAL_MODULE_ID = 'virtual:playground-files'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.html', '.json'])
const EXPECTED_SKIP_EXTENSIONS = new Set([
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.log',
  '.map',
  '.md',
  '.png',
  '.svg',
  '.tsbuildinfo',
  '.txt',
  '.webp',
])
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist'])

const RUNTIME_DEV_DEPENDENCIES = new Set(['@foldkit/vite-plugin', 'vite'])

// NOTE: vite 8 bundles rolldown, whose wasm binding crashes in the WebContainer
// ("RangeError: Invalid atomic access index" out of @emnapi's atomics). Pin the
// playground to vite 7 (esbuild + rollup), which the WebContainer runs. The
// examples themselves stay on vite 8; this override only affects the in-browser
// preview.
const WEBCONTAINER_VITE_VERSION = '^7'

const STANDALONE_VITE_CONFIG = `import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
})
`

const ROOT_LOADING_MARKUP = `<div id="root"><div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#9ca3af">Loading\u2026</div></div>`

type DependencySpec = Readonly<Record<string, string>>

type PackageJson = Readonly<{
  dependencies?: DependencySpec
  devDependencies?: DependencySpec
  [key: string]: unknown
}>

type TsConfig = Readonly<{
  extends?: string
  compilerOptions?: Readonly<Record<string, unknown>>
  include?: ReadonlyArray<string>
  exclude?: ReadonlyArray<string>
  [key: string]: unknown
}>

const rewriteWorkspaceSpec =
  (versions: Readonly<Record<string, string>>) =>
  (name: string, specifier: string): string => {
    if (specifier !== 'workspace:*') {
      return specifier
    }
    const version = versions[name]
    return version === undefined ? specifier : `^${version}`
  }

const rewriteDependencyMap = (
  dependencies: DependencySpec | undefined,
  rewrite: (name: string, specifier: string) => string,
): DependencySpec | undefined => {
  if (dependencies === undefined) {
    return undefined
  }
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, specifier]) => [
      name,
      rewrite(name, specifier),
    ]),
  )
}

const filterToRuntimeDevDependencies = (
  devDependencies: DependencySpec | undefined,
): DependencySpec | undefined => {
  if (devDependencies === undefined) {
    return undefined
  }
  const entries = Object.entries(devDependencies).filter(([name]) =>
    RUNTIME_DEV_DEPENDENCIES.has(name),
  )
  return entries.length === 0 ? undefined : Object.fromEntries(entries)
}

const pinWebContainerVite = (
  devDependencies: DependencySpec | undefined,
): DependencySpec | undefined =>
  devDependencies !== undefined && 'vite' in devDependencies
    ? { ...devDependencies, vite: WEBCONTAINER_VITE_VERSION }
    : devDependencies

const transformPackageJson = (
  raw: string,
  versions: Readonly<Record<string, string>>,
): string => {
  const packageJson: PackageJson = JSON.parse(raw)
  const rewrite = rewriteWorkspaceSpec(versions)
  const transformed = {
    ...packageJson,
    dependencies: rewriteDependencyMap(packageJson.dependencies, rewrite),
    devDependencies: pinWebContainerVite(
      rewriteDependencyMap(
        filterToRuntimeDevDependencies(packageJson.devDependencies),
        rewrite,
      ),
    ),
  }
  return JSON.stringify(transformed, null, 2) + '\n'
}

const transformTsConfig = (
  raw: string,
  baseCompilerOptions: Readonly<Record<string, unknown>>,
  baseExclude: ReadonlyArray<string>,
): string => {
  const tsConfig: TsConfig = JSON.parse(raw)
  const merged = {
    compilerOptions: {
      ...baseCompilerOptions,
      ...(tsConfig.compilerOptions ?? {}),
    },
    ...(tsConfig.include ? { include: tsConfig.include } : {}),
    exclude: Array.dedupe([...baseExclude, ...(tsConfig.exclude ?? [])]),
  }
  return JSON.stringify(merged, null, 2) + '\n'
}

const ROOT_ELEMENT_PATTERN = /<div\b[^>]*\bid="root"[^>]*>\s*<\/div>/

const injectLoadingPlaceholder = (indexHtml: string, slug: string): string => {
  if (!ROOT_ELEMENT_PATTERN.test(indexHtml)) {
    throw new Error(
      `[playground-files] Could not find <div id="root"></div> in ${slug}/index.html to inject the playground loading placeholder. ` +
        `Ensure the example's index.html contains an empty root div.`,
    )
  }
  return indexHtml.replace(ROOT_ELEMENT_PATTERN, ROOT_LOADING_MARKUP)
}

const collectFiles = async (
  directory: string,
  baseDirectory: string,
): Promise<ReadonlyArray<readonly [string, string]>> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const results: Array<readonly [string, string]> = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry.name)) {
        continue
      }
      const nested = await collectFiles(
        join(entry.parentPath, entry.name),
        baseDirectory,
      )
      results.push(...nested)
      continue
    }
    const extension = extname(entry.name)
    if (!INCLUDED_EXTENSIONS.has(extension)) {
      if (!EXPECTED_SKIP_EXTENSIONS.has(extension)) {
        const relativePath = relative(
          baseDirectory,
          join(entry.parentPath, entry.name),
        )
        console.warn(
          `[playground-files] Skipping ${relativePath} — extension "${extension}" is not in the playground allowlist. ` +
            `If this file is needed at runtime, add the extension to INCLUDED_EXTENSIONS in playgroundFilesPlugin.ts. ` +
            `If it is intentionally not bundled, add the extension to EXPECTED_SKIP_EXTENSIONS to silence this warning.`,
        )
      }
      continue
    }
    const absolutePath = join(entry.parentPath, entry.name)
    const relativePath = relative(baseDirectory, absolutePath)
    const contents = await readFile(absolutePath, 'utf-8')
    results.push([relativePath, contents] as const)
  }
  return results
}

const buildExampleFileMap = async (
  slug: string,
  versions: Readonly<Record<string, string>>,
  baseCompilerOptions: Readonly<Record<string, unknown>>,
  baseExclude: ReadonlyArray<string>,
): Promise<Record<string, string>> => {
  const exampleDirectory = resolve(EXAMPLES_DIRECTORY, slug)
  const rawFiles = await collectFiles(exampleDirectory, exampleDirectory)

  const transformedEntries = rawFiles.map(([path, contents]) => {
    if (path === 'package.json') {
      return [path, transformPackageJson(contents, versions)] as const
    }
    if (path === 'tsconfig.json') {
      return [
        path,
        transformTsConfig(contents, baseCompilerOptions, baseExclude),
      ] as const
    }
    if (path === 'vite.config.ts') {
      return [path, STANDALONE_VITE_CONFIG] as const
    }
    if (path === 'index.html') {
      return [path, injectLoadingPlaceholder(contents, slug)] as const
    }
    return [path, contents] as const
  })

  return Object.fromEntries(transformedEntries)
}

export const playgroundFilesPlugin = (): Plugin => ({
  name: 'playground-files',
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

    const versionEntries = await Promise.all(
      Object.entries(WORKSPACE_PACKAGE_JSON_PATHS).map(
        async ([name, packageJsonPath]) => {
          const packageJson: { version: string } = JSON.parse(
            await readFile(packageJsonPath, 'utf-8'),
          )
          return [name, packageJson.version] as const
        },
      ),
    )
    const versions = Object.fromEntries(versionEntries)
    const tsConfigBase: TsConfig = JSON.parse(
      await readFile(TS_CONFIG_BASE_PATH, 'utf-8'),
    )

    const baseCompilerOptions = tsConfigBase.compilerOptions ?? {}
    const baseExclude = tsConfigBase.exclude ?? []

    const entries = await Promise.all(
      exampleSlugs.map(async slug => {
        const files = await buildExampleFileMap(
          slug,
          versions,
          baseCompilerOptions,
          baseExclude,
        )
        return [slug, { files }] as const
      }),
    )

    const bySlug = Object.fromEntries(entries)

    return `export default ${JSON.stringify(bySlug)}`
  },
})
