import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryDir = resolve(packageDir, '../..')
const harnessDir = process.env.HARNESS_DIR

if (!harnessDir) {
  throw new Error(
    'HARNESS_DIR is required: path to a js-framework-benchmark clone',
  )
}

const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const harnessPackagePath = join(harnessDir, 'package.json')
const implementationsDir = join(harnessDir, 'frameworks/keyed')

if (
  !existsSync(harnessPackagePath) ||
  readJson(harnessPackagePath).name !== 'js-framework-benchmark' ||
  !existsSync(implementationsDir) ||
  !lstatSync(implementationsDir).isDirectory()
) {
  throw new Error(`${harnessDir} is not a js-framework-benchmark clone`)
}

const source = join(packageDir, 'dist')

if (!existsSync(join(source, 'main.js'))) {
  throw new Error('Missing dist/main.js; run pnpm build first')
}

const target = join(implementationsDir, 'foldkit')
const targetPackagePath = join(target, 'package.json')
const installedPackageName = 'js-framework-benchmark-foldkit'

if (
  existsSync(target) &&
  (!lstatSync(target).isDirectory() ||
    !existsSync(targetPackagePath) ||
    readJson(targetPackagePath).name !== installedPackageName)
) {
  throw new Error(
    `Refusing to replace an unrecognized implementation at ${target}`,
  )
}

const targetDist = join(target, 'dist')

if (existsSync(targetDist) && !lstatSync(targetDist).isDirectory()) {
  throw new Error(`Refusing to replace a non-directory at ${targetDist}`)
}

const foldkit = readJson(join(repositoryDir, 'packages/foldkit/package.json'))
const foldkitVersion = `${foldkit.version}-workspace`
const effect = readJson(join(packageDir, 'package.json')).dependencies.effect
const dependencies = { foldkit: foldkitVersion, effect }
const metadata = {
  name: installedPackageName,
  version: '1.0.0',
  private: true,
  license: 'Apache-2.0',
  type: 'module',
  'js-framework-benchmark': {
    frameworkVersionFromPackage: 'foldkit',
    frameworkHomeURL: 'https://foldkit.dev/',
    language: 'TypeScript',
    repoURL: 'https://github.com/foldkit/foldkit',
  },
  dependencies,
}
const lock = {
  name: installedPackageName,
  version: '1.0.0',
  lockfileVersion: 3,
  requires: true,
  packages: {
    '': { name: installedPackageName, version: '1.0.0', dependencies },
    'node_modules/foldkit': { version: foldkitVersion },
    'node_modules/effect': { version: effect },
  },
}

mkdirSync(target, { recursive: true })
rmSync(targetDist, { recursive: true, force: true })
cpSync(source, targetDist, { recursive: true })
cpSync(join(packageDir, 'index.html'), join(target, 'index.html'))
cpSync(join(packageDir, 'LICENSE'), join(target, 'LICENSE'))
writeFileSync(targetPackagePath, `${JSON.stringify(metadata, null, 2)}\n`)
writeFileSync(
  join(target, 'package-lock.json'),
  `${JSON.stringify(lock, null, 2)}\n`,
)

console.log(`Installed workspace Foldkit ${foldkitVersion} into ${target}`)
