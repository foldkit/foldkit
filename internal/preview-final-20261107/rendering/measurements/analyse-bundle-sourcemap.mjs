import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

import {
  TraceMap,
  decodedMappings,
} from '../../../../node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs'

const [javascriptPath, sourceMapPath, outputPath] = process.argv.slice(2)
assert(javascriptPath, 'Missing JavaScript path')
assert(sourceMapPath, 'Missing source-map path')
assert(outputPath, 'Missing output path')

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const javascriptBytes = readFileSync(javascriptPath)
const javascript = javascriptBytes.toString('utf8')
assert.deepEqual(Buffer.from(javascript), javascriptBytes)

const sourceMapBytes = readFileSync(sourceMapPath)
const sourceMapJson = JSON.parse(sourceMapBytes.toString('utf8'))
const traceMap = new TraceMap(sourceMapJson)
const mappingsByLine = decodedMappings(traceMap)

const generatedLines = []
let lineStart = 0
for (let index = 0; index < javascript.length; index += 1) {
  const character = javascript[index]
  if (character !== '\n' && character !== '\r') {
    continue
  }
  const lineEnd = index
  let newline = character
  if (character === '\r' && javascript[index + 1] === '\n') {
    newline = '\r\n'
    index += 1
  }
  generatedLines.push({
    content: javascript.slice(lineStart, lineEnd),
    newline,
  })
  lineStart = index + 1
}
if (lineStart < javascript.length || javascript.length === 0) {
  generatedLines.push({ content: javascript.slice(lineStart), newline: '' })
}

const mapDirectory = dirname(resolve(sourceMapPath))
const normalizedSource = source => {
  if (source === undefined) {
    return '[unmapped]'
  }
  const absolute = resolve(mapDirectory, source).replaceAll('\\', '/')
  for (const marker of [
    '/packages/foldkit/src/',
    '/internal/lustre-benchmark/',
  ]) {
    const index = absolute.indexOf(marker)
    if (index !== -1) {
      return absolute.slice(index + 1)
    }
  }
  const pnpmIndex = absolute.indexOf('/node_modules/.pnpm/')
  if (pnpmIndex !== -1) {
    return absolute.slice(pnpmIndex + 1)
  }
  return relative(process.cwd(), absolute).replaceAll('\\', '/')
}

const bucketFor = source => {
  if (source === '[unmapped]') {
    return 'Unmapped or generated wrapper'
  }
  if (source.startsWith('internal/lustre-benchmark/')) {
    return 'Benchmark application'
  }
  if (
    source.startsWith('packages/foldkit/src/block/') ||
    source.startsWith('packages/foldkit/src/binding/') ||
    source.startsWith('packages/foldkit/src/experimental/contracted/') ||
    source.startsWith('packages/foldkit/src/experimental/constructed/') ||
    source.startsWith('packages/foldkit/src/experimental/hybrid/')
  ) {
    return 'Foldkit Block authoring and completion'
  }
  if (source.startsWith('packages/foldkit/src/runtime/')) {
    return 'Foldkit Runtime'
  }
  if (source.startsWith('packages/foldkit/src/')) {
    return 'Other Foldkit'
  }
  return 'Effect and other dependencies'
}

const moduleTotals = new Map()
let spanCount = 0
const addSpan = (source, text) => {
  if (text.length === 0) {
    return
  }
  const bytes = Buffer.byteLength(text)
  if (bytes === 0) {
    return
  }
  spanCount += 1
  const normalized = normalizedSource(source)
  const previous = moduleTotals.get(normalized) ?? {
    source: normalized,
    bucket: bucketFor(normalized),
    bytes: 0,
    spans: 0,
  }
  previous.bytes += bytes
  previous.spans += 1
  moduleTotals.set(normalized, previous)
}

for (
  let lineIndex = 0;
  lineIndex < generatedLines.length;
  lineIndex += 1
) {
  const { content, newline } = generatedLines[lineIndex]
  const mappings = mappingsByLine[lineIndex] ?? []
  let column = 0
  let source
  for (const mapping of mappings) {
    const nextColumn = mapping[0]
    assert(nextColumn >= column, `Unsorted mapping on line ${lineIndex + 1}`)
    assert(
      nextColumn <= content.length,
      `Mapping exceeds line ${lineIndex + 1}: ${nextColumn} > ${content.length}`,
    )
    addSpan(source, content.slice(column, nextColumn))
    source = mapping.length >= 4 ? sourceMapJson.sources[mapping[1]] : undefined
    column = nextColumn
  }
  addSpan(source, content.slice(column))
  addSpan(undefined, newline)
}

const modules = Array.from(moduleTotals.values()).sort(
  (left, right) => right.bytes - left.bytes || left.source.localeCompare(right.source),
)
const attributedBytes = modules.reduce((total, module) => total + module.bytes, 0)
assert.equal(attributedBytes, javascriptBytes.length)

const bucketMap = new Map()
for (const module of modules) {
  const previous = bucketMap.get(module.bucket) ?? {
    bucket: module.bucket,
    bytes: 0,
    modules: 0,
    spans: 0,
  }
  previous.bytes += module.bytes
  previous.modules += 1
  previous.spans += module.spans
  bucketMap.set(module.bucket, previous)
}
const buckets = Array.from(bucketMap.values())
  .map(bucket => ({
    ...bucket,
    percent: Number(((bucket.bytes / javascriptBytes.length) * 100).toFixed(4)),
  }))
  .sort((left, right) => right.bytes - left.bytes)
assert.equal(
  buckets.reduce((total, bucket) => total + bucket.bytes, 0),
  javascriptBytes.length,
)

const result = {
  schemaVersion: 1,
  method: {
    description:
      'Disjoint generated intervals between successive source-map segments are assigned to the active mapped source; explicit unmapped segments, line prefixes, and line endings use the unmapped bucket.',
    generatedColumns: 'UTF-16 code units converted to UTF-8 byte lengths',
    compression: 'Whole JavaScript asset only; no per-module gzip attribution',
  },
  javascript: {
    path: resolve(javascriptPath),
    bytes: javascriptBytes.length,
    gzipBytes: gzipSync(javascriptBytes).length,
    sha256: sha256(javascriptBytes),
    lines: generatedLines.length,
  },
  sourceMap: {
    path: resolve(sourceMapPath),
    bytes: sourceMapBytes.length,
    gzipBytes: gzipSync(sourceMapBytes).length,
    sha256: sha256(sourceMapBytes),
    sources: sourceMapJson.sources.length,
    mappedLines: mappingsByLine.length,
  },
  controls: {
    attributedBytes,
    exactRawByteSum: attributedBytes === javascriptBytes.length,
    disjointSpanCount: spanCount,
  },
  buckets,
  modules,
}

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
  flag: 'wx',
})
console.log(JSON.stringify({ buckets, controls: result.controls }, null, 2))
