import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  publicWorkspacePackages,
  readWorkspacePackages,
} from '../../../scripts/lib/workspace-packages.mjs'
import { EXAMPLE_VALUES } from '../dist/examples.js'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..')
const DIST_TEMPLATE_ROOT = resolve(PACKAGE_ROOT, 'dist/templates')
const TOOL_DEPENDENCIES = [
  '@foldkit/devtools',
  '@foldkit/vite-plugin',
  '@foldkit/devtools-mcp',
  '@foldkit/oxlint-plugin',
  '@types/node',
  'happy-dom',
  'oxfmt',
  'oxlint',
  'vitest',
]

const fail = message => {
  throw new Error(message)
}

const readJson = path => JSON.parse(readFileSync(path, 'utf8'))

const currentCommit = () => {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    return fail('could not resolve the commit for the scaffold artifact')
  }

  return result.stdout.trim()
}

const baseReleaseManifest = () => {
  const configuredPath = process.env['FOLDKIT_RELEASE_MANIFEST']

  if (configuredPath !== undefined) {
    return readJson(configuredPath)
  }

  const packages = publicWorkspacePackages(readWorkspacePackages(REPO_ROOT))

  return {
    schemaVersion: 1,
    channel: 'stable',
    sourceCommit: currentCommit(),
    packages: Object.fromEntries(
      packages.map(pkg => [pkg.packageJson.name, pkg.packageJson.version]),
    ),
  }
}

const dependencyCandidates = name => {
  const manifests = [
    resolve(REPO_ROOT, 'package.json'),
    ...EXAMPLE_VALUES.map(example =>
      resolve(REPO_ROOT, 'examples', example, 'package.json'),
    ),
    resolve(REPO_ROOT, 'examples/ssg/package.json'),
    resolve(REPO_ROOT, 'examples/ssr/package.json'),
  ]

  return new Set(
    manifests.flatMap(path => {
      const manifest = readJson(path)
      const version =
        manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]

      return typeof version === 'string' && !version.startsWith('workspace:')
        ? [version]
        : []
    }),
  )
}

const dependencyVersions = releaseManifest =>
  Object.fromEntries(
    TOOL_DEPENDENCIES.map(name => {
      const packageVersion = releaseManifest.packages[name]

      if (typeof packageVersion === 'string') {
        return [name, packageVersion]
      }

      const candidates = [...dependencyCandidates(name)]

      if (candidates.length !== 1) {
        return fail(
          `expected one release-owned version for ${name}, found ${candidates.join(', ')}`,
        )
      }

      return [name, candidates[0]]
    }),
  )

const copyExample = example => {
  const sourceRoot = resolve(REPO_ROOT, 'examples', example)
  const targetRoot = resolve(DIST_TEMPLATE_ROOT, 'examples', example)

  if (!existsSync(sourceRoot)) {
    return fail(`missing scaffold example ${example}`)
  }

  mkdirSync(targetRoot, { recursive: true })
  cpSync(resolve(sourceRoot, 'src'), resolve(targetRoot, 'src'), {
    recursive: true,
  })
  cpSync(
    resolve(sourceRoot, 'package.json'),
    resolve(targetRoot, 'package.json'),
  )
}

const releaseManifest = baseReleaseManifest()

cpSync(resolve(PACKAGE_ROOT, 'templates'), DIST_TEMPLATE_ROOT, {
  recursive: true,
})

for (const example of [...EXAMPLE_VALUES, 'ssg', 'ssr']) {
  copyExample(example)
}

writeFileSync(
  resolve(DIST_TEMPLATE_ROOT, 'release.json'),
  `${JSON.stringify(
    {
      ...releaseManifest,
      dependencies: dependencyVersions(releaseManifest),
    },
    null,
    2,
  )}\n`,
)
