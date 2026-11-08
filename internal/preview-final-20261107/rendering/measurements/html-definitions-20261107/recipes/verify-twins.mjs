import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs'
import { join, relative } from 'node:path'

const roots = {
  baseline: '/private/tmp/foldkit-html-definition-twins-20261107/baseline',
  candidate: '/private/tmp/foldkit-html-definition-twins-20261107/candidate',
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const includedRoots = [
  'packages/foldkit/src',
  'packages/vite-plugin-foldkit/src',
  'internal/lustre-benchmark/src',
]
const includedFiles = [
  'package.json',
  'pnpm-lock.yaml',
  'tsconfig.base.json',
  'packages/foldkit/package.json',
  'packages/foldkit/tsconfig.json',
  'packages/foldkit/tsconfig.build.json',
  'packages/foldkit/vitest.config.ts',
  'packages/vite-plugin-foldkit/package.json',
  'internal/lustre-benchmark/package.json',
  'internal/lustre-benchmark/tsconfig.json',
  'internal/lustre-benchmark/vite.config.ts',
  'examples/vite.aliases.ts',
]

const walkFiles = (root, directory, output) => {
  const absolute = join(root, directory)
  for (const name of readdirSync(absolute).sort()) {
    const path = join(absolute, name)
    const stat = lstatSync(path)
    const key = relative(root, path)
    if (stat.isDirectory()) walkFiles(root, key, output)
    else if (stat.isFile()) output.set(key, sha256(readFileSync(path)))
  }
}
const manifest = root => {
  const output = new Map()
  for (const directory of includedRoots) walkFiles(root, directory, output)
  for (const file of includedFiles) output.set(file, sha256(readFileSync(join(root, file))))
  return output
}
const baseline = manifest(roots.baseline)
const candidate = manifest(roots.candidate)
const keys = [...new Set([...baseline.keys(), ...candidate.keys()])].sort()
const differences = keys
  .filter(key => baseline.get(key) !== candidate.get(key))
  .map(file => ({ file, baseline: baseline.get(file) ?? null, candidate: candidate.get(file) ?? null }))

const localLinks = [
  'node_modules/foldkit',
  'packages/vite-plugin-foldkit/node_modules/foldkit',
  'internal/lustre-benchmark/node_modules/foldkit',
  'internal/lustre-benchmark/node_modules/@foldkit/vite-plugin',
]
const links = Object.fromEntries(Object.entries(roots).map(([name, root]) => [
  name,
  localLinks.map(file => ({
    file,
    target: readlinkSync(join(root, file)),
    realpath: realpathSync(join(root, file)),
    isSelf: realpathSync(join(root, file)).startsWith(`${root}/packages/`),
  })),
]))

console.log(JSON.stringify({
  roots,
  fileCounts: { baseline: baseline.size, candidate: candidate.size },
  differences,
  allowedDifferences: [
    'packages/foldkit/src/html/index.ts',
    'packages/foldkit/src/html/attributeConstruction.test.ts',
  ],
  links,
  node: { executable: process.execPath, version: process.version, sha256: sha256(readFileSync(process.execPath)) },
  typescript: {
    executable: `${roots.baseline}/packages/foldkit/node_modules/typescript/bin/tsc`,
    packageVersion: JSON.parse(readFileSync(`${roots.baseline}/packages/foldkit/node_modules/typescript/package.json`)).version,
  },
}, null, 2))
