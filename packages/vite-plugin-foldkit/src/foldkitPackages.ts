import { Array, Predicate } from 'effect'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

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

/** Resolves the installed packages that must share Foldkit's runtime instance.
 *
 * @internal
 */
export const resolveInstalledFoldkitPackages = (
  root: string,
): Array<string> => {
  // NOTE: Vite can supply a relative root before it resolves the config, while
  // createRequire requires an absolute path.
  const requireFromRoot = createRequire(resolve(root, 'noop.js'))
  return Array.filter(FOLDKIT_SINGLETON_PACKAGES, packageName => {
    try {
      requireFromRoot.resolve(packageName)
      return true
    } catch (error) {
      // NOTE: optional ESM-only packages can throw
      // ERR_PACKAGE_PATH_NOT_EXPORTED even when installed. Only
      // MODULE_NOT_FOUND proves this consumer does not have the package.
      return !(
        error instanceof Error &&
        Predicate.hasProperty(error, 'code') &&
        error.code === 'MODULE_NOT_FOUND'
      )
    }
  })
}
