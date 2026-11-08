const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { readFileSync, writeFileSync } = require('node:fs')
const { basename, join } = require('node:path')
const ts = require('/private/tmp/foldkit-unified-recovery-20261103/node_modules/typescript/lib/typescript.js')
const {
  TraceMap,
  decodedMappings,
  originalPositionFor,
  LEAST_UPPER_BOUND,
} = require('/private/tmp/foldkit-unified-recovery-20261103/node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping')

const root = '/private/tmp/foldkit-official-workcount-cpu-20261107'
const snapshot = '/private/tmp/foldkit-record-release-rendering-xpwmm820'
const json = path => JSON.parse(readFileSync(path, 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const cpuReceipt = json(join(root, 'cpu-escalated/receipt.json'))
const coverageReceipt = json(join(root, 'coverage/receipt.json'))
const mapReceipt = json(join(root, 'map-preparation-receipt.json'))
const artifactReceipt = json(join(snapshot, 'final-artifact-receipt.json'))

assert.equal(cpuReceipt.status, 'complete')
assert.equal(coverageReceipt.status, 'complete')
assert.equal(cpuReceipt.browserAndServerClosed, true)
assert.equal(coverageReceipt.browserAndServerClosed, true)
assert.equal(cpuReceipt.artifactReceipt.sha256, coverageReceipt.artifactReceipt.sha256)
assert.equal(sha(readFileSync(join(snapshot, 'final-artifact-receipt.json'))), cpuReceipt.artifactReceipt.sha256)

const slots = {
  'foldkit-main-optimised': {
    role: 'main-optimized',
    js: '/private/tmp/foldkit-unified-profile-20261104/maps-main/assets/index.optimised-UkWhNSKN.js',
    map: '/private/tmp/foldkit-unified-profile-20261104/maps-main/assets/index.optimised-UkWhNSKN.js.map',
    jsSha256: mapReceipt.retainedExactMaps.mainOptimised.javascriptSha256,
    mapSha256: mapReceipt.retainedExactMaps.mainOptimised.sourceMapSha256,
  },
  'foldkit-preview-final-optimised': {
    role: 'preview-optimized',
    js: mapReceipt.previewOptimised.javascript.path,
    map: mapReceipt.previewOptimised.sourceMap.path,
    jsSha256: mapReceipt.previewOptimised.javascript.sha256,
    mapSha256: mapReceipt.previewOptimised.sourceMap.sha256,
  },
  'foldkit-main': {
    role: 'main-naive',
    js: mapReceipt.mainNaive.javascript.path,
    map: mapReceipt.mainNaive.sourceMap.path,
    jsSha256: mapReceipt.mainNaive.javascript.sha256,
    mapSha256: mapReceipt.mainNaive.sourceMap.sha256,
  },
  'foldkit-preview-final': {
    role: 'preview-naive',
    js: mapReceipt.retainedExactMaps.previewNaive.javascript,
    map: mapReceipt.retainedExactMaps.previewNaive.sourceMap,
    jsSha256: mapReceipt.retainedExactMaps.previewNaive.javascriptSha256,
    mapSha256: mapReceipt.retainedExactMaps.previewNaive.sourceMapSha256,
  },
}

const normalizeSource = source => {
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

const astCache = new Map()
const enclosingName = (source, content, line, column) => {
  if (!content || line == null || column == null) return undefined
  let cached = astCache.get(source)
  if (!cached) {
    const file = ts.createSourceFile(source, content, ts.ScriptTarget.Latest, true)
    const functions = []
    const visit = (node, parents) => {
      let names = parents
      if (ts.isFunctionLike(node) && node.body) {
        let name = node.name?.getText(file)
        let owner = node
        if (ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent) || ts.isMethodDeclaration(node.parent)) {
          name = node.parent.name?.getText(file) ?? name
          owner = node.parent
        }
        names = name ? [...parents, name] : parents
        functions.push({ start: owner.getStart(file), end: owner.end, name: names.join('.') })
      }
      ts.forEachChild(node, child => visit(child, names))
    }
    visit(file, [])
    cached = { file, functions }
    astCache.set(source, cached)
  }
  const offset = cached.file.getPositionOfLineAndCharacter(line - 1, column)
  return cached.functions
    .filter(item => item.start <= offset && offset < item.end)
    .sort((left, right) => (left.end - left.start) - (right.end - right.start))[0]?.name
}

const isRelevant = source => /(?:internal\/lustre-benchmark\/src\/(?:todo|view\.optimised|application(?:\.optimised)?|entry(?:\.optimised)?)\.ts|packages\/foldkit\/src\/(?:runtime\/(?:renderer|runtime|program)|snabbdom\/init|block\/[^/]+|program\/[^/]+|experimental\/hybrid\/authoring|struct\/index|html\/(?:index|lazy)|vdom)\.ts)/.test(source ?? '')

const mapData = new Map()
for (const [slot, config] of Object.entries(slots)) {
  const jsBytes = readFileSync(config.js)
  const jsText = jsBytes.toString('utf8')
  const mapBytes = readFileSync(config.map)
  assert.equal(sha(jsBytes), config.jsSha256)
  assert.equal(sha(mapBytes), config.mapSha256)
  const raw = JSON.parse(mapBytes)
  const trace = new TraceMap(raw)
  const lineStarts = [0]
  for (let index = 0; index < jsText.length; index++) if (jsText.charCodeAt(index) === 10) lineStarts.push(index + 1)
  const mappings = []
  const decoded = decodedMappings(trace)
  for (let line = 0; line < decoded.length; line++) {
    for (const segment of decoded[line]) {
      if (segment.length < 4) continue
      const offset = lineStarts[line] + segment[0]
      const source = raw.sources[segment[1]]
      mappings.push({
        offset,
        source,
        normalizedSource: normalizeSource(source),
        line: segment[2] + 1,
        column: segment[3],
        name: segment.length >= 5 ? raw.names?.[segment[4]] : undefined,
        content: raw.sourcesContent?.[segment[1]],
      })
    }
  }
  mapData.set(slot, { ...config, jsBytes, jsText, raw, trace, lineStarts, mappings })
}

const lowerBound = (mappings, offset) => {
  let low = 0
  let high = mappings.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (mappings[middle].offset < offset) low = middle + 1
    else high = middle
  }
  return low
}

const coverageResults = []
for (const captured of coverageReceipt.results) {
  const slot = captured.slot
  const map = mapData.get(slot)
  assert(map)
  assert.equal(captured.asset.sha256, map.jsSha256)
  assert.equal(captured.asset.executedSha256, map.jsSha256)
  assert.deepEqual(captured.result.counts, { sync: 400, timeout: 0, animation_frame: 400, microtask: 0, promise: 0 })
  assert.deepEqual(captured.finalDom, { hasNewTodo: true, todoCount: 0 })
  const path = join(root, 'coverage', captured.captureFile)
  const bytes = readFileSync(path)
  assert.equal(sha(bytes), captured.captureSha256)
  const scripts = JSON.parse(bytes)
  assert.equal(scripts.length, 1)
  const functions = []
  for (const fn of scripts[0].functions) {
    const range = fn.ranges[0]
    let index = lowerBound(map.mappings, range.startOffset)
    let mapping
    while (index < map.mappings.length && map.mappings[index].offset < range.endOffset) {
      if (map.mappings[index].source) { mapping = map.mappings[index]; break }
      index++
    }
    if (!mapping) continue
    const name = enclosingName(mapping.source, mapping.content, mapping.line, mapping.column) || mapping.name || fn.functionName || '(anonymous)'
    functions.push({
      name,
      generatedName: fn.functionName,
      source: mapping.normalizedSource,
      sourceLine: mapping.line,
      sourceColumn: mapping.column,
      count: range.count,
      generatedStartOffset: range.startOffset,
      generatedEndOffset: range.endOffset,
    })
  }
  coverageResults.push({
    slot,
    role: slots[slot].role,
    captureSha256: captured.captureSha256,
    functionCount: captured.functionCount,
    relevantFunctions: functions.filter(row => isRelevant(row.source)),
  })
}

const cpuResults = []
for (const captured of cpuReceipt.results) {
  const slot = captured.slot
  const map = mapData.get(slot)
  assert(map)
  assert.equal(captured.asset.sha256, map.jsSha256)
  assert.equal(captured.asset.executedSha256, map.jsSha256)
  assert.deepEqual(captured.result.counts, { sync: 400, timeout: 0, animation_frame: 400, microtask: 0, promise: 0 })
  assert.deepEqual(captured.finalDom, { hasNewTodo: true, todoCount: 0 })
  const path = join(root, 'cpu-escalated', captured.captureFile)
  const bytes = readFileSync(path)
  assert.equal(sha(bytes), captured.captureSha256)
  const profile = JSON.parse(bytes)
  assert.equal(profile.samples.length, profile.timeDeltas.length)
  const nodes = new Map(profile.nodes.map(node => [node.id, node]))
  const parents = new Map()
  for (const node of profile.nodes) for (const child of node.children ?? []) {
    assert(!parents.has(child))
    parents.set(child, node.id)
  }
  const facts = new Map()
  const functions = new Map()
  const sources = new Map()
  for (const node of profile.nodes) {
    const frame = node.callFrame
    if (!frame.url.includes(`/priv/implementations/${slot}/dist/assets/`)) continue
    assert.equal(basename(frame.url), basename(map.js))
    const original = originalPositionFor(map.trace, {
      line: frame.lineNumber + 1,
      column: frame.columnNumber,
      bias: LEAST_UPPER_BOUND,
    })
    const sourceIndex = map.raw.sources.indexOf(original.source)
    const content = sourceIndex >= 0 ? map.raw.sourcesContent?.[sourceIndex] : undefined
    const source = normalizeSource(original.source)
    const name = enclosingName(original.source, content, original.line, original.column) || original.name || frame.functionName || '(anonymous)'
    const key = JSON.stringify([source ?? frame.url, original.line ?? frame.lineNumber, original.column ?? frame.columnNumber, name])
    const fact = { key, name, generatedName: frame.functionName, source, sourceLine: original.line, sourceColumn: original.column }
    facts.set(node.id, fact)
    if (!functions.has(key)) functions.set(key, { ...fact, selfUs: 0, inclusiveUs: 0, selfSamples: 0, inclusiveSamples: 0 })
    if (source && !sources.has(source)) sources.set(source, { source, selfUs: 0, inclusiveUs: 0, selfSamples: 0, inclusiveSamples: 0 })
  }
  let bundleSelfUs = 0
  for (let index = 0; index < profile.samples.length; index++) {
    const id = profile.samples[index]
    const delta = profile.timeDeltas[index]
    const leaf = facts.get(id)
    if (leaf) {
      const row = functions.get(leaf.key)
      row.selfUs += delta
      row.selfSamples++
      bundleSelfUs += delta
      if (leaf.source) {
        const source = sources.get(leaf.source)
        source.selfUs += delta
        source.selfSamples++
      }
    }
    const seenFunctions = new Set()
    const seenSources = new Set()
    for (let current = id; current !== undefined; current = parents.get(current)) {
      const fact = facts.get(current)
      if (!fact) continue
      if (!seenFunctions.has(fact.key)) {
        const row = functions.get(fact.key)
        row.inclusiveUs += delta
        row.inclusiveSamples++
        seenFunctions.add(fact.key)
      }
      if (fact.source && !seenSources.has(fact.source)) {
        const source = sources.get(fact.source)
        source.inclusiveUs += delta
        source.inclusiveSamples++
        seenSources.add(fact.source)
      }
    }
  }
  const expose = row => ({
    name: row.name,
    generatedName: row.generatedName,
    source: row.source,
    sourceLine: row.sourceLine,
    sourceColumn: row.sourceColumn,
    selfMs: Number((row.selfUs / 1000).toFixed(3)),
    inclusiveMs: Number((row.inclusiveUs / 1000).toFixed(3)),
    selfSamples: row.selfSamples,
    inclusiveSamples: row.inclusiveSamples,
    selfPercentOfBundle: Number((100 * row.selfUs / bundleSelfUs).toFixed(2)),
  })
  const sortRows = (values, field) => [...values].sort((left, right) => right[field] - left[field]).map(expose)
  cpuResults.push({
    slot,
    role: slots[slot].role,
    captureSha256: captured.captureSha256,
    profileDurationMs: Number(((profile.endTime - profile.startTime) / 1000).toFixed(3)),
    sampledBundleSelfMs: Number((bundleSelfUs / 1000).toFixed(3)),
    topBundleSelf: sortRows(functions.values(), 'selfUs').slice(0, 25),
    topBundleInclusive: sortRows(functions.values(), 'inclusiveUs').slice(0, 25),
    relevantFunctions: sortRows([...functions.values()].filter(row => isRelevant(row.source)), 'selfUs'),
    relevantSources: sortRows([...sources.values()].filter(row => isRelevant(row.source)), 'selfUs'),
  })
}

const result = {
  schemaVersion: 1,
  label: 'Source-matched analysis of one boot-inclusive CPU capture and one separate precise-coverage work-count capture per frozen official asset',
  sourceIdentities: mapReceipt.sourceIdentities,
  artifactReceiptSha256: cpuReceipt.artifactReceipt.sha256,
  node: cpuReceipt.node,
  chromium: cpuReceipt.chromium,
  workload: cpuReceipt.workload,
  span: cpuReceipt.span,
  cleanup: {
    cpu: cpuReceipt.browserAndServerClosed,
    coverage: coverageReceipt.browserAndServerClosed,
    cpuPortClosedByOwnedServer: cpuReceipt.portClosedByOwnedServer,
    coveragePortClosedByOwnedServer: coverageReceipt.portClosedByOwnedServer,
  },
  limitations: [
    'Each CPU profile is a single descriptive sample and includes app boot, idle waits, and workload; it is not an official latency result.',
    'Inclusive CPU rows overlap and must not be summed.',
    'Precise coverage changes V8 optimization and cadence. Only exact counts are used; its elapsed times and CPU shape are invalid.',
    'The actual-main legacy Runtime.makeApplication and preview Block/Program paths are an end-to-end architecture comparison, not isolated graph or registration attribution.',
  ],
  coverageResults,
  cpuResults,
}

const output = join(root, 'source-matched-analysis-final.json')
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({
  output,
  sha256: sha(readFileSync(output)),
  coverage: coverageResults.map(row => ({ slot: row.slot, relevantFunctions: row.relevantFunctions.length })),
  cpu: cpuResults.map(row => ({ slot: row.slot, sampledBundleSelfMs: row.sampledBundleSelfMs, relevantFunctions: row.relevantFunctions.length })),
}, null, 2))
