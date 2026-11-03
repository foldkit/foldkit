import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryDirectory = resolve(appDirectory, '../../..')
const originalDirectory =
  process.env.FOLDKIT_DOMAINS_SOURCE ??
  '/Users/devinjameson/Repos/foldkit-domains'
const originalModules = join(originalDirectory, 'node_modules')
const localModules = join(appDirectory, 'node_modules')

assert(
  existsSync(join(originalModules, 'vite/package.json')),
  'Install the original Domains app dependencies first.',
)

const link = (target, destination) => {
  mkdirSync(dirname(destination), { recursive: true })
  rmSync(destination, { force: true, recursive: true })
  symlinkSync(target, destination)
}

mkdirSync(localModules, { recursive: true })

for (const name of readdirSync(originalModules)) {
  if (name.startsWith('.')) {
    continue
  }

  if (name.startsWith('@')) {
    for (const scopedName of readdirSync(join(originalModules, name))) {
      link(
        realpathSync(join(originalModules, name, scopedName)),
        join(localModules, name, scopedName),
      )
    }
  } else {
    link(realpathSync(join(originalModules, name)), join(localModules, name))
  }
}

const localPackages = {
  foldkit: 'packages/foldkit',
  effect: 'node_modules/effect',
  '@effect/platform-browser':
    'packages/foldkit/node_modules/@effect/platform-browser',
  '@foldkit/ui': 'packages/ui',
  '@foldkit/devtools': 'packages/devtools',
  '@foldkit/devtools-mcp': 'packages/devtools-mcp',
  '@foldkit/vite-plugin': 'packages/vite-plugin-foldkit',
  '@foldkit/oxlint-plugin': 'packages/oxlint-plugin-foldkit',
}

for (const [name, relativePath] of Object.entries(localPackages)) {
  link(
    realpathSync(join(repositoryDirectory, relativePath)),
    join(localModules, name),
  )
}

const appPackage = JSON.parse(
  readFileSync(join(appDirectory, 'package.json'), 'utf8'),
)

for (const name of Object.keys({
  ...appPackage.dependencies,
  ...appPackage.devDependencies,
})) {
  const packageDirectory = join(localModules, name)
  const packageJson = JSON.parse(
    readFileSync(join(packageDirectory, 'package.json'), 'utf8'),
  )
  const bins =
    typeof packageJson.bin === 'string'
      ? { [packageJson.name.split('/').at(-1)]: packageJson.bin }
      : (packageJson.bin ?? {})

  for (const [binName, relativePath] of Object.entries(bins)) {
    link(
      join(packageDirectory, relativePath),
      join(localModules, '.bin', binName),
    )
  }
}

link(
  join(originalDirectory, 'infra/node_modules'),
  join(appDirectory, 'infra/node_modules'),
)

const appRequire = createRequire(join(appDirectory, 'package.json'))
const coreRequire = createRequire(
  join(repositoryDirectory, 'packages/foldkit/package.json'),
)
const uiRequire = createRequire(
  join(repositoryDirectory, 'packages/ui/package.json'),
)
const effectPath = realpathSync(appRequire.resolve('effect'))

assert.equal(effectPath, realpathSync(coreRequire.resolve('effect')))
assert.equal(effectPath, realpathSync(uiRequire.resolve('effect')))
assert.equal(
  JSON.parse(readFileSync(join(localModules, 'effect/package.json'), 'utf8'))
    .version,
  '4.1.0',
)

for (const artifact of [
  'packages/foldkit/dist/experimental/layered/public.js',
  'packages/ui/dist/index.js',
  'packages/devtools/dist/vite.js',
  'packages/devtools-mcp/dist/server.js',
  'packages/vite-plugin-foldkit/dist/index.js',
]) {
  assert(
    existsSync(join(repositoryDirectory, artifact)),
    `Build the local package artifact: ${artifact}`,
  )
}

console.log(
  'Linked the local Foldkit packages and one Effect 4.1.0 runtime; original app unchanged.',
)
