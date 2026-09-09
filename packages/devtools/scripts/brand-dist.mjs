import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { brandDistDirectory } from '@foldkit/vite-plugin'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const { name: packageName } = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf8'),
)

const { brandedCount, skippedCount } = brandDistDirectory(
  packageRoot,
  packageName,
)

console.log(
  `brand-dist(${packageName}): branded ${brandedCount} files, skipped ${skippedCount}`,
)
