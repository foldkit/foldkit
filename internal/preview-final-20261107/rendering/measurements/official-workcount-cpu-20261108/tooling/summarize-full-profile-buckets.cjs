const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { readFileSync, writeFileSync } = require('node:fs')
const { basename, join } = require('node:path')
const {
  TraceMap,
  originalPositionFor,
  LEAST_UPPER_BOUND,
} = require('/private/tmp/foldkit-unified-recovery-20261103/node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping')

const root = '/private/tmp/foldkit-official-workcount-cpu-20261107'
const receipt = JSON.parse(readFileSync(join(root, 'cpu-escalated/receipt.json')))
const mapsReceipt = JSON.parse(readFileSync(join(root, 'map-preparation-receipt.json')))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const maps = {
  'foldkit-main-optimised': {
    javascript: '/private/tmp/foldkit-unified-profile-20261104/maps-main/assets/index.optimised-UkWhNSKN.js',
    javascriptSha256: mapsReceipt.retainedExactMaps.mainOptimised.javascriptSha256,
    sourceMap: mapsReceipt.retainedExactMaps.mainOptimised.sourceMap,
    sourceMapSha256: mapsReceipt.retainedExactMaps.mainOptimised.sourceMapSha256,
  },
  'foldkit-preview-final-optimised': {
    javascript: mapsReceipt.previewOptimised.javascript.path,
    javascriptSha256: mapsReceipt.previewOptimised.javascript.sha256,
    sourceMap: mapsReceipt.previewOptimised.sourceMap.path,
    sourceMapSha256: mapsReceipt.previewOptimised.sourceMap.sha256,
  },
  'foldkit-main': {
    javascript: mapsReceipt.mainNaive.javascript.path,
    javascriptSha256: mapsReceipt.mainNaive.javascript.sha256,
    sourceMap: mapsReceipt.mainNaive.sourceMap.path,
    sourceMapSha256: mapsReceipt.mainNaive.sourceMap.sha256,
  },
  'foldkit-preview-final': {
    javascript: mapsReceipt.retainedExactMaps.previewNaive.javascript,
    javascriptSha256: mapsReceipt.retainedExactMaps.previewNaive.javascriptSha256,
    sourceMap: mapsReceipt.retainedExactMaps.previewNaive.sourceMap,
    sourceMapSha256: mapsReceipt.retainedExactMaps.previewNaive.sourceMapSha256,
  },
}

const normalize = source => {
  if (!source) return undefined
  for (const marker of ['packages/', 'internal/']) {
    const index = source.lastIndexOf(marker)
    if (index >= 0) return source.slice(index)
  }
  const dependency = source.lastIndexOf('/node_modules/')
  if (dependency >= 0) return source.slice(dependency + 1)
  const benchmark = /(?:^|\/)src\/(todo|view\.optimised|application(?:\.optimised)?|entry(?:\.optimised)?)\.ts$/.exec(source)
  return benchmark ? `internal/lustre-benchmark/src/${benchmark[1]}.ts` : source
}

const sourceBucket = source => {
  if (!source) return 'app-unmapped'
  if (/packages\/foldkit\/src\/(?:html\/|vdom\.ts$|struct\/)/.test(source)) return 'html-vnode-construction'
  if (/packages\/foldkit\/src\/runtime\/renderer\.ts$/.test(source)) return 'renderer'
  if (/packages\/foldkit\/src\/snabbdom\//.test(source)) return 'snabbdom'
  if (/packages\/foldkit\/src\/(?:block\/|experimental\/hybrid\/|runtime\/program\.ts$)/.test(source)) return 'block-program-wrappers'
  if (/packages\/foldkit\/src\/runtime\//.test(source)) return 'runtime-other'
  if (/internal\/lustre-benchmark\/src\//.test(source)) return 'application'
  if (/packages\/foldkit\//.test(source)) return 'foldkit-other'
  if (/node_modules\//.test(source)) return 'dependencies'
  return 'app-other-source'
}

const results = []
for (const captured of receipt.results) {
  const config = maps[captured.slot]
  assert(config)
  assert.equal(sha(readFileSync(config.javascript)), config.javascriptSha256)
  const mapBytes = readFileSync(config.sourceMap)
  assert.equal(sha(mapBytes), config.sourceMapSha256)
  assert.equal(captured.asset.executedSha256, config.javascriptSha256)
  const raw = JSON.parse(mapBytes)
  const trace = new TraceMap(raw)
  const profileBytes = readFileSync(join(root, 'cpu-escalated', captured.captureFile))
  assert.equal(sha(profileBytes), captured.captureSha256)
  const profile = JSON.parse(profileBytes)
  assert.equal(profile.samples.length, profile.timeDeltas.length)
  const nodes = new Map(profile.nodes.map(node => [node.id, node]))
  const nodeFacts = new Map()
  for (const node of profile.nodes) {
    const frame = node.callFrame
    if (!frame.url.includes(`/priv/implementations/${captured.slot}/dist/assets/`)) continue
    assert.equal(basename(frame.url), basename(config.javascript))
    const original = originalPositionFor(trace, {
      line: frame.lineNumber + 1,
      column: frame.columnNumber,
      bias: LEAST_UPPER_BOUND,
    })
    const source = normalize(original.source)
    nodeFacts.set(node.id, { source, bucket: sourceBucket(source) })
  }
  const bucketsUs = new Map()
  const sourcesUs = new Map()
  const functionsUs = new Map()
  for (let index = 0; index < profile.samples.length; index++) {
    const id = profile.samples[index]
    const delta = profile.timeDeltas[index]
    const node = nodes.get(id)
    assert(node)
    const fact = nodeFacts.get(id)
    let bucket
    if (fact) {
      bucket = fact.bucket
      if (fact.source) sourcesUs.set(fact.source, (sourcesUs.get(fact.source) ?? 0) + delta)
    } else if (/garbage collector/i.test(node.callFrame.functionName)) {
      bucket = 'garbage-collector'
    } else if (node.callFrame.functionName === '(idle)') {
      bucket = 'idle'
    } else if (node.callFrame.functionName === '(program)') {
      bucket = 'program-native'
    } else if (!node.callFrame.url) {
      bucket = 'empty-url-native-or-unmapped'
    } else if (/runner\.html|run\.mjs|server\.mjs/.test(node.callFrame.url)) {
      bucket = 'driver'
    } else {
      bucket = 'other-url'
    }
    bucketsUs.set(bucket, (bucketsUs.get(bucket) ?? 0) + delta)
    const functionKey = `${bucket}\t${node.callFrame.functionName || '(anonymous)'}\t${node.callFrame.url || '(empty URL)'}`
    functionsUs.set(functionKey, (functionsUs.get(functionKey) ?? 0) + delta)
  }
  const totalUs = profile.timeDeltas.reduce((sum, delta) => sum + delta, 0)
  const rows = values => [...values]
    .sort((left, right) => right[1] - left[1])
    .map(([name, us]) => ({ name, selfMs: Number((us / 1000).toFixed(3)), percent: Number((100 * us / totalUs).toFixed(3)) }))
  results.push({
    slot: captured.slot,
    captureSha256: captured.captureSha256,
    sampledDurationMs: Number((totalUs / 1000).toFixed(3)),
    buckets: rows(bucketsUs),
    topSources: rows(sourcesUs).slice(0, 40),
    topLeafFrames: rows(functionsUs).slice(0, 40),
  })
}

const output = {
  schemaVersion: 1,
  label: 'Full leaf-sample buckets for the four retained ordinary CPU profiles',
  method: 'Every timeDelta is assigned to its sampled leaf; app-bundle leaves are source-mapped through the exact hidden-map twin. Buckets are mutually exclusive.',
  limits: [
    'The CDP span is boot-inclusive and dominated by driver/idle/native waits; these are not callback-time measurements.',
    'Empty-URL and program frames cannot be authenticated as application source and are not reassigned.',
    'One profile per slot cannot resolve small bucket differences or native lifecycle causality.',
  ],
  results,
}
const outputPath = join(root, 'full-profile-buckets.json')
writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ outputPath, sha256: sha(readFileSync(outputPath)), results: results.map(({ slot, sampledDurationMs, buckets }) => ({ slot, sampledDurationMs, buckets })) }, null, 2))
