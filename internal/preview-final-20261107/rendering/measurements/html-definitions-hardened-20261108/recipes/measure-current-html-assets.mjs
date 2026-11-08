import { createHash } from 'node:crypto'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = '/private/tmp/foldkit-html-current-twins-20261108'
const receiptPath = '/private/tmp/foldkit-html-hardened-verification-20261108/current-assets.json'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const readAsset = (tree, variant) => {
  const directory = join(root, tree, 'internal/lustre-benchmark/dist', variant, 'assets')
  const name = readdirSync(directory).find(name => name.endsWith('.js'))
  if (name === undefined) throw new Error(`Missing JavaScript asset in ${directory}`)
  const path = join(directory, name)
  const bytes = readFileSync(path)
  return {
    path,
    file: name,
    bytes: statSync(path).size,
    gzipBytes: gzipSync(bytes).length,
    brotliBytes: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
    sha256: sha256(bytes),
  }
}

const receipt = {
  schemaVersion: 1,
  sourceCommit: '3f0a41b9279c5296020871303c8bcec2358cb368',
  node: '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node',
  baseline: {
    naive: readAsset('baseline', 'naive'),
    optimised: readAsset('baseline', 'optimised'),
  },
  candidate: {
    naive: readAsset('candidate', 'naive'),
    optimised: readAsset('candidate', 'optimised'),
  },
}

writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
