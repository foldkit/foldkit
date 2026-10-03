import { Array, Option, Record, Schema, pipe } from 'effect'
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { type UserConfig, searchForWorkspaceRoot } from 'vite'
import { crawlFrameworkPkgs, findDepPkgJsonPath } from 'vitefu'

const FOLDKIT_SINGLETON_PACKAGES: ReadonlyArray<string> = [
  'foldkit',
  '@foldkit/ui',
  '@foldkit/devtools',
]

/** Tests whether an import refers to a package that must share Foldkit's
 * runtime instance.
 *
 * @internal
 */
export const isFoldkitSingletonPackageSpecifier = (
  specifier: string,
): boolean =>
  Array.some(
    FOLDKIT_SINGLETON_PACKAGES,
    packageName =>
      specifier === packageName || specifier.startsWith(`${packageName}/`),
  )

const isFoldkitPackageName = (name: string): boolean =>
  name === 'foldkit' || name.startsWith('@foldkit/')

const decodeDependencyRecord = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Unknown),
)

const dependencyNames = (field: unknown): ReadonlyArray<string> =>
  pipe(
    decodeDependencyRecord(field),
    Option.match({ onNone: () => [], onSome: Record.keys }),
  )

const dependsOnFoldkit = (packageJson: Record<string, unknown>): boolean =>
  pipe(
    [packageJson['dependencies'], packageJson['peerDependencies']],
    Array.flatMap(dependencyNames),
    Array.some(isFoldkitPackageName),
  )

const toCrawlRoot = (root: string): string => {
  const absoluteRoot = resolve(root)

  // NOTE: vitefu realpaths each dependency's package.json and compares it with
  // workspaceRoot. An unresolved root that runs through a symlink would stop
  // private workspace packages from being recognized.
  try {
    return realpathSync(absoluteRoot)
  } catch {
    return absoluteRoot
  }
}

/** Finds the installed packages an application's server render must bundle
 * and the Foldkit packages Vite must deduplicate.
 *
 * @internal
 */
export const crawlFoldkitPackages = async (
  root: string,
  isBuild: boolean,
  viteUserConfig: UserConfig,
): Promise<
  Readonly<{ dedupe: Array<string>; ssrNoExternal: Array<string> }>
> => {
  const crawlRoot = toCrawlRoot(root)

  const crawl = await crawlFrameworkPkgs({
    root: crawlRoot,
    workspaceRoot: searchForWorkspaceRoot(crawlRoot),
    isBuild,
    viteUserConfig,
    isSemiFrameworkPkgByJson: dependsOnFoldkit,
  })

  const ssrNoExternal = Array.dedupe([
    ...FOLDKIT_SINGLETON_PACKAGES,
    ...crawl.ssr.noExternal,
  ])

  const maybeResolvableSingletons = await Promise.all(
    Array.map(FOLDKIT_SINGLETON_PACKAGES, async packageName =>
      pipe(
        await findDepPkgJsonPath(packageName, crawlRoot),
        Option.fromUndefinedOr,
        Option.as(packageName),
      ),
    ),
  )
  const dedupe = Array.getSomes(maybeResolvableSingletons)

  return { dedupe, ssrNoExternal }
}
