import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'

import { transformViewIdentity } from './viewIdentity.js'

const SYNTHETIC_ROOT = '/virtual'
const SCRIPT_FILE_EXTENSION = '.js'

/** Result of {@link brandDistDirectory}: per-file branding counts. */
export type BrandDistResult = Readonly<{
  brandedCount: number
  skippedCount: number
}>

/**
 * Brands every compiled `.js` file under `<packageRoot>/dist` in place by
 * applying {@link transformViewIdentity} to each one, so packages such as
 * `@foldkit/ui` and `@foldkit/devtools` ship dist output whose view functions
 * carry identities without requiring consumers to run the Vite plugin over
 * `node_modules`.
 *
 * Module ids follow the `/virtual/<packageName>/<relativePath>` scheme
 * against a `/virtual` synthetic root, so identities are stable across
 * machines and never leak build-host paths. Files the transform returns
 * `null` for (no functions, or already branded) are counted as skipped.
 */
export const brandDistDirectory = (
  packageRoot: string,
  packageName: string,
): BrandDistResult => {
  const distDirectory = join(packageRoot, 'dist')

  const relativeScriptPaths = readdirSync(distDirectory, {
    recursive: true,
    encoding: 'utf8',
  })
    .filter(relativePath => relativePath.endsWith(SCRIPT_FILE_EXTENSION))
    .sort()

  const brandFlags = relativeScriptPaths.map(relativePath => {
    const absolutePath = join(distDirectory, relativePath)
    const posixRelativePath = relativePath.split(sep).join('/')
    const syntheticId = `${SYNTHETIC_ROOT}/${packageName}/${posixRelativePath}`
    const code = readFileSync(absolutePath, 'utf8')
    const result = transformViewIdentity(code, syntheticId, SYNTHETIC_ROOT)
    if (result === null) {
      return false
    }
    writeFileSync(absolutePath, result.code)
    return true
  })

  const brandedCount = brandFlags.filter(isBranded => isBranded).length
  return { brandedCount, skippedCount: brandFlags.length - brandedCount }
}
