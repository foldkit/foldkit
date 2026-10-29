import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const expectedVersion = process.argv[2]

if (expectedVersion === undefined) {
  throw new Error(
    'Usage: node scripts/effect-runtime.mjs <expected-effect-version>',
  )
}

const lockPath = resolve(process.cwd(), 'package-lock.json')
const lock = JSON.parse(readFileSync(lockPath, 'utf8'))

if (lock.lockfileVersion !== 3) {
  throw new Error(`Expected package-lock v3, received ${lock.lockfileVersion}`)
}

const effectEntries = Object.entries(lock.packages ?? {}).filter(
  ([packagePath]) =>
    packagePath === 'node_modules/effect' ||
    packagePath.endsWith('/node_modules/effect'),
)

if (effectEntries.length !== 1) {
  throw new Error(
    `Expected one physical Effect install in package-lock, found ${effectEntries.length}`,
  )
}

const [[effectPath, effectEntry]] = effectEntries

if (
  effectPath !== 'node_modules/effect' ||
  effectEntry.version !== expectedVersion
) {
  throw new Error(
    `Expected root Effect ${expectedVersion}, found ${effectPath} ${effectEntry.version}`,
  )
}

const consumerRequire = createRequire(resolve(process.cwd(), 'package.json'))
const rootEffectPath = realpathSync(
  consumerRequire.resolve('effect/package.json'),
)
const packages = [
  'foldkit',
  '@foldkit/ui',
  '@foldkit/devtools/vite',
  '@foldkit/devtools-mcp',
  '@foldkit/markdown',
  '@foldkit/node',
  '@foldkit/vite-plugin',
  '@effect/platform-browser',
  '@effect/platform-node',
  '@effect/platform-node-shared',
]

const resolutions = packages.map(packageName => {
  const packageEntry = fileURLToPath(import.meta.resolve(packageName))
  const packageRequire = createRequire(packageEntry)
  const resolvedEffect = realpathSync(
    packageRequire.resolve('effect/package.json'),
  )

  return { packageName, resolvedEffect }
})

const effectPaths = new Set(
  resolutions.map(({ resolvedEffect }) => resolvedEffect),
)

if (effectPaths.size !== 1 || !effectPaths.has(rootEffectPath)) {
  throw new Error(
    `Packages resolve different Effect installs: ${JSON.stringify(resolutions)}`,
  )
}

let npmTree

try {
  npmTree = execFileSync('npm', ['ls', '--all', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
} catch (error) {
  const detail =
    typeof error.stdout === 'string' && error.stdout.length > 0
      ? error.stdout
      : String(error.stderr ?? error.message)
  throw new Error(`npm ls reported invalid or missing peers:\n${detail}`)
}

const npmTreeResult = JSON.parse(npmTree)

if (npmTreeResult.problems !== undefined && npmTreeResult.problems.length > 0) {
  throw new Error(
    `npm ls reported dependency problems: ${JSON.stringify(npmTreeResult.problems)}`,
  )
}

const installedEffect = JSON.parse(readFileSync(rootEffectPath, 'utf8'))

if (installedEffect.version !== expectedVersion) {
  throw new Error(
    `Expected installed Effect ${expectedVersion}, found ${installedEffect.version}`,
  )
}

console.log(
  JSON.stringify({
    effectVersion: expectedVersion,
    effectPath: rootEffectPath,
    resolvedPackages: resolutions.length,
    npmLs: 'ok',
  }),
)
