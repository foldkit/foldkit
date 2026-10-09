import { Array } from 'effect'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { engineRangeFailures } from './lib/engine-ranges.mjs'
import {
  publicWorkspacePackages,
  readWorkspacePackages,
} from './lib/workspace-packages.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspacePackages = readWorkspacePackages(REPO_ROOT)
const publicPackages = publicWorkspacePackages(workspacePackages)

const readDependencyManifest = (pkg, dependencyName) => {
  const workspaceDependency = workspacePackages.find(
    candidate => candidate.packageJson.name === dependencyName,
  )

  if (workspaceDependency !== undefined) {
    return workspaceDependency.packageJson
  }

  const manifestPath = resolve(
    pkg.dir,
    'node_modules',
    dependencyName,
    'package.json',
  )

  if (!existsSync(manifestPath)) {
    return undefined
  }

  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

const failures = engineRangeFailures(publicPackages, readDependencyManifest)

if (Array.isArrayNonEmpty(failures)) {
  console.error('Node engine ranges are wrong:\n')
  for (const failure of failures) {
    console.error(`  ${failure}`)
  }
  console.error(
    '\nGive each published package an engines.node range that every dependency and required peer accepts, with no clause that another clause already covers.',
  )
  process.exit(1)
}

console.log(
  `Node engine ranges hold for ${publicPackages.length} published packages.`,
)
