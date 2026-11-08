import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync, brotliCompressSync } from 'node:zlib'

const root = '/private/tmp/foldkit-html-definition-twins-20261107'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const oneJs = dir => {
  const assets = join(dir, 'assets')
  const files = readdirSync(assets).filter(file => file.endsWith('.js'))
  if (files.length !== 1) throw new Error(`Expected one JS asset in ${assets}: ${files}`)
  return join(assets, files[0])
}

const result = {}
for (const tree of ['baseline', 'candidate']) {
  result[tree] = {}
  for (const variant of ['naive', 'optimised']) {
    const file = oneJs(join(root, tree, 'internal/lustre-benchmark/dist', variant))
    const bytes = readFileSync(file)
    result[tree][variant] = {
      file,
      raw: statSync(file).size,
      gzip: gzipSync(bytes).length,
      brotli: brotliCompressSync(bytes).length,
      sha256: sha256(bytes),
    }
  }
}
result.delta = {}
for (const variant of ['naive', 'optimised']) {
  result.delta[variant] = {
    raw: result.candidate[variant].raw - result.baseline[variant].raw,
    gzip: result.candidate[variant].gzip - result.baseline[variant].gzip,
    brotli: result.candidate[variant].brotli - result.baseline[variant].brotli,
  }
}
console.log(JSON.stringify(result, null, 2))
