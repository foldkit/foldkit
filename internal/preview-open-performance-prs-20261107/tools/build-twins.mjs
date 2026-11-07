import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const [workspaceArgument, repositoryArgument = process.cwd()] =
  process.argv.slice(2)
if (workspaceArgument === undefined) {
  throw new Error(
    'Usage: node build-twins.mjs <workspace-with-baseline-and-candidate> [dependency-repository]',
  )
}

const workspace = resolve(workspaceArgument)
const repositoryRoot = resolve(repositoryArgument)
const require = createRequire(`${repositoryRoot}/package.json`)
const vitePackage = require.resolve('vite/package.json')
const vite = join(dirname(vitePackage), 'bin/vite.js')
const expectedNodeSha256 =
  '533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

assert.equal(
  sha(readFileSync(process.execPath)),
  expectedNodeSha256,
  `Use the recorded Node 26.13.0 binary, not ${process.execPath}`,
)

const commonEnv = { ...process.env }
delete commonEnv.NODE_ENV
delete commonEnv.VITE_USER_NODE_ENV
delete commonEnv.MODE
delete commonEnv.BUILD_VARIANT
Object.assign(commonEnv, {
  CI: '1',
  LANG: 'C.UTF-8',
  LC_ALL: 'C.UTF-8',
  NO_COLOR: '1',
})

const build = tree => {
  const treeRoot = join(workspace, tree)
  const cwd = join(treeRoot, 'internal/lustre-benchmark')
  assert.equal(
    realpathSync(join(cwd, 'node_modules/foldkit')),
    join(treeRoot, 'packages/foldkit'),
    `${tree} benchmark does not resolve its isolated Foldkit package`,
  )
  rmSync(join(cwd, 'dist'), { recursive: true, force: true })
  execFileSync(process.execPath, [vite, 'build', '--mode', 'production'], {
    cwd,
    env: commonEnv,
    stdio: 'inherit',
  })
  execFileSync(process.execPath, [vite, 'build', '--mode', 'production'], {
    cwd,
    env: { ...commonEnv, BUILD_VARIANT: 'optimised' },
    stdio: 'inherit',
  })
  const source = join(cwd, 'dist/optimised/index.optimised.html')
  const target = join(cwd, 'dist/optimised/index.html')
  assert(existsSync(source), source)
  renameSync(source, target)

  return Object.fromEntries(
    ['naive', 'optimised'].map(variant => {
      const assets = join(cwd, 'dist', variant, 'assets')
      const file = readdirSync(assets).find(name => name.endsWith('.js'))
      assert(file !== undefined, `${tree} ${variant} JavaScript asset`)
      const bytes = readFileSync(join(assets, file))
      return [
        variant,
        {
          file,
          bytes: bytes.length,
          gzipBytes: gzipSync(bytes).length,
          sha256: sha(bytes),
        },
      ]
    }),
  )
}

console.log(
  JSON.stringify(
    { baseline: build('baseline'), candidate: build('candidate') },
    null,
    2,
  ),
)
