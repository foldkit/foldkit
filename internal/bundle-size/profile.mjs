import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { build } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

const HARNESS_ROOT = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HARNESS_ROOT, '../..')
const BASELINE_PATH = resolve(HARNESS_ROOT, 'baseline.json')
const REPORT_PATH = resolve(HARNESS_ROOT, 'dist/report.json')
const PERFORMANCE_PAGE_PATH = resolve(
  REPO_ROOT,
  'packages/website/src/page/performance.md',
)
const TABLE_START = '### Measurements'
const TABLE_END = '### Interpretation'
const FIXTURES = [
  'empty',
  'effect',
  'counter',
  'button-root',
  'button-deep',
  'dialog',
  'popover',
  'popover-root',
  'lazy-popover',
  'combobox',
  'date-picker',
]
const SIZE_KEYS = ['raw', 'gzip', 'brotli']
const PUBLIC_ROWS = [
  ['Effect Schema decode only', 'effect'],
  ['Foldkit counter', 'counter'],
  ['Counter + Button', 'button-root'],
  ['Counter + Dialog API', 'dialog'],
  ['Counter + Popover API', 'popover'],
  ['Counter + Combobox API', 'combobox'],
  ['Counter + DatePicker API', 'date-picker'],
]

const emptySizes = () => ({ raw: 0, gzip: 0, brotli: 0 })

const addSizes = (left, right) => ({
  raw: left.raw + right.raw,
  gzip: left.gzip + right.gzip,
  brotli: left.brotli + right.brotli,
})

const measure = source => {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source)

  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  }
}

const sumSizes = assets =>
  assets.reduce((total, asset) => addSizes(total, asset.sizes), emptySizes())

const normalizeModuleId = id => id.replaceAll('\\', '/')

const groupModule = id => {
  const path = normalizeModuleId(id)

  if (path.includes('/packages/ui/dist/')) {
    return '@foldkit/ui'
  }
  if (path.includes('/packages/foldkit/dist/')) {
    return 'foldkit'
  }
  if (path.includes('/node_modules/@effect/platform-browser/')) {
    return '@effect/platform-browser'
  }
  if (path.includes('/node_modules/.pnpm/@effect+platform-browser@')) {
    return '@effect/platform-browser'
  }
  if (path.includes('/node_modules/@floating-ui/')) {
    return 'Floating UI'
  }
  if (path.includes('/node_modules/.pnpm/@floating-ui+')) {
    return 'Floating UI'
  }
  if (path.includes('/node_modules/effect/')) {
    return 'Effect'
  }
  if (path.includes('/node_modules/.pnpm/effect@')) {
    return 'Effect'
  }
  if (path.includes('/internal/bundle-size/src/')) {
    return 'fixture'
  }

  return 'other'
}

const displayModuleId = id => {
  const path = normalizeModuleId(id)
  const packageStore = path.indexOf('/node_modules/.pnpm/')

  if (packageStore !== -1) {
    return path.slice(packageStore + 1)
  }

  const repositoryPath = relative(REPO_ROOT, path)
  if (!repositoryPath.startsWith('..')) {
    return repositoryPath
  }

  return path
}

const collectStaticChunks = chunks => {
  const chunksByFileName = new Map(chunks.map(chunk => [chunk.fileName, chunk]))
  const initial = new Set()
  const pending = chunks
    .filter(chunk => chunk.isEntry)
    .map(chunk => chunk.fileName)

  if (pending.length !== 1) {
    throw new Error(`Expected one entry chunk, found ${pending.length}`)
  }

  while (pending.length > 0) {
    const fileName = pending.pop()
    if (initial.has(fileName)) {
      continue
    }

    const chunk = chunksByFileName.get(fileName)
    if (chunk === undefined) {
      throw new Error(`Missing static chunk ${fileName}`)
    }

    initial.add(fileName)
    pending.push(...chunk.imports)
  }

  return initial
}

const measureOutput = output => {
  const chunks = output.filter(item => item.type === 'chunk')
  const assets = output.filter(item => item.type === 'asset')
  const initialChunks = collectStaticChunks(chunks)
  const initialCss = new Set(
    chunks
      .filter(chunk => initialChunks.has(chunk.fileName))
      .flatMap(chunk => [...(chunk.viteMetadata?.importedCss ?? [])]),
  )
  const jsAssets = chunks.map(chunk => ({
    fileName: chunk.fileName,
    phase: initialChunks.has(chunk.fileName) ? 'initial' : 'lazy',
    sizes: measure(chunk.code),
  }))
  const cssAssets = assets
    .filter(asset => asset.fileName.endsWith('.css'))
    .map(asset => ({
      fileName: asset.fileName,
      phase: initialCss.has(asset.fileName) ? 'initial' : 'lazy',
      sizes: measure(asset.source),
    }))
  const modules = chunks
    .flatMap(chunk =>
      Object.entries(chunk.modules).map(([id, details]) => ({
        id: displayModuleId(id),
        group: groupModule(id),
        phase: initialChunks.has(chunk.fileName) ? 'initial' : 'lazy',
        renderedLength: details.renderedLength,
      })),
    )
    .filter(module => module.renderedLength > 0)
    .sort((left, right) => right.renderedLength - left.renderedLength)
  const renderedCodeByGroup = Object.fromEntries(
    [...new Set(modules.map(module => module.group))]
      .sort()
      .map(group => [
        group,
        modules
          .filter(module => module.group === group)
          .reduce((total, module) => total + module.renderedLength, 0),
      ]),
  )

  return {
    initial: {
      js: sumSizes(jsAssets.filter(asset => asset.phase === 'initial')),
      css: sumSizes(cssAssets.filter(asset => asset.phase === 'initial')),
    },
    lazy: {
      js: sumSizes(jsAssets.filter(asset => asset.phase === 'lazy')),
      css: sumSizes(cssAssets.filter(asset => asset.phase === 'lazy')),
    },
    assets: [...jsAssets, ...cssAssets],
    renderedCodeByGroup,
    modules,
  }
}

const profileFixture = async name => {
  const result = await build({
    root: HARNESS_ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [foldkit({ devToolsMcpPort: false })],
    build: {
      target: 'es2022',
      minify: 'oxc',
      sourcemap: false,
      write: false,
      rolldownOptions: {
        input: resolve(HARNESS_ROOT, 'src', `${name}.ts`),
      },
    },
  })

  if (globalThis.Array.isArray(result)) {
    throw new Error(`${name} produced multiple build outputs`)
  }

  return measureOutput(result.output)
}

const assertTreeShaking = fixtures => {
  const unexpected = []
  const checkAbsent = (fixtureName, group, reason) => {
    const found = fixtures[fixtureName].modules.find(
      module => module.group === group,
    )
    if (found !== undefined) {
      unexpected.push(
        `${fixtureName} retained ${group}: ${found.id} (${reason})`,
      )
    }
  }

  checkAbsent('counter', '@foldkit/ui', 'core runtime should not load UI')
  checkAbsent(
    'counter',
    'Floating UI',
    'core runtime should not load positioning',
  )
  checkAbsent(
    'button-root',
    'Floating UI',
    'Button should not load positioning',
  )
  checkAbsent(
    'button-deep',
    'Floating UI',
    'Button should not load positioning',
  )

  for (const group of ['@foldkit/ui', 'Floating UI']) {
    const found = fixtures['lazy-popover'].modules.find(
      module => module.phase === 'initial' && module.group === group,
    )
    if (found !== undefined) {
      unexpected.push(`lazy-popover retained ${group} initially: ${found.id}`)
    }
  }
  if (fixtures['lazy-popover'].lazy.js.gzip === 0) {
    unexpected.push('lazy-popover did not produce a deferred JavaScript chunk')
  }

  for (const name of ['popover', 'popover-root', 'date-picker']) {
    const hasInitialFloatingUi = fixtures[name].modules.some(
      module => module.phase === 'initial' && module.group === 'Floating UI',
    )
    const hasLazyFloatingUi = fixtures[name].modules.some(
      module => module.phase === 'lazy' && module.group === 'Floating UI',
    )
    if (hasInitialFloatingUi || !hasLazyFloatingUi) {
      unexpected.push(`${name} must defer Floating UI until its Mount runs`)
    }
  }

  for (const [name, fixture] of Object.entries(fixtures)) {
    for (const module of fixture.modules) {
      if (module.id.includes('packages/foldkit/dist/test/')) {
        unexpected.push(`${name} retained Foldkit test code: ${module.id}`)
      }
      if (module.id.includes('/parse5/')) {
        unexpected.push(`${name} retained parse5: ${module.id}`)
      }
      if (module.id.endsWith('/devTools/webSocketBridge.js')) {
        unexpected.push(`${name} retained the development WebSocket bridge`)
      }
    }
  }

  for (const [rootName, deepName] of [
    ['button-root', 'button-deep'],
    ['popover-root', 'popover'],
  ]) {
    const rootGzip = fixtures[rootName].initial.js.gzip
    const deepGzip = fixtures[deepName].initial.js.gzip
    if (rootGzip > deepGzip + 1024) {
      unexpected.push(
        `${rootName} is ${rootGzip - deepGzip} gzip bytes larger than ${deepName}`,
      )
    }
  }

  return unexpected
}

const baselineFrom = fixtures => ({
  schemaVersion: 1,
  fixtures: Object.fromEntries(
    FIXTURES.map(name => [
      name,
      {
        initial: fixtures[name].initial,
        lazy: fixtures[name].lazy,
      },
    ]),
  ),
})

const compareBaseline = (baseline, current) => {
  if (baseline.schemaVersion !== current.schemaVersion) {
    return ['Bundle-size baseline schema does not match the profiler']
  }

  const regressions = []
  for (const name of FIXTURES) {
    const expected = baseline.fixtures[name]
    if (expected === undefined) {
      regressions.push(`Missing baseline fixture: ${name}`)
      continue
    }

    for (const phase of ['initial', 'lazy']) {
      for (const type of ['js', 'css']) {
        for (const sizeKey of SIZE_KEYS) {
          const before = expected[phase][type][sizeKey]
          const after = current.fixtures[name][phase][type][sizeKey]
          const allowance = Math.max(
            sizeKey === 'raw' ? 4096 : 1024,
            Math.ceil(before * 0.05),
          )

          if (after > before + allowance) {
            regressions.push(
              `${name} ${phase} ${type} ${sizeKey}: ${before} -> ${after} bytes (+${after - before}; allowance ${allowance})`,
            )
          }
        }
      }
    }
  }

  return regressions
}

const formatKilobytes = bytes => `${(bytes / 1000).toFixed(1)} KB`

const renderPublicTable = baseline => {
  const rows = PUBLIC_ROWS.map(([label, fixtureName]) => {
    const { initial, lazy } = baseline.fixtures[fixtureName]
    return [
      label,
      formatKilobytes(initial.js.raw),
      formatKilobytes(initial.js.gzip),
      formatKilobytes(initial.js.brotli),
      lazy.js.gzip === 0 ? '—' : formatKilobytes(lazy.js.gzip),
    ]
  })
  const headers = [
    'Consumer',
    'Initial raw',
    'Initial gzip',
    'Initial Brotli',
    'Deferred gzip',
  ]
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map(row => row.at(column).length)),
  )
  const formatRow = row =>
    `| ${row.map((cell, column) => (column === 0 ? cell.padEnd(widths.at(column)) : cell.padStart(widths.at(column)))).join(' | ')} |`
  const separator = `| ${widths.map((width, column) => (column === 0 ? '-'.repeat(width) : `${'-'.repeat(width - 1)}:`)).join(' | ')} |`

  return [formatRow(headers), separator, ...rows.map(formatRow)].join('\n')
}

const tableBounds = page => {
  const start = page.indexOf(TABLE_START)
  const end = page.indexOf(TABLE_END)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      'The performance page is missing its bundle-size table markers',
    )
  }

  return { start: start + TABLE_START.length, end }
}

const synchronizePublicTable = async (baseline, isWrite) => {
  const page = await readFile(PERFORMANCE_PAGE_PATH, 'utf8')
  const { start, end } = tableBounds(page)
  const expected = renderPublicTable(baseline)
  const actual = page.slice(start, end).trim()

  if (isWrite) {
    const updated = `${page.slice(0, start)}\n\n${expected}\n\n${page.slice(end)}`
    await writeFile(PERFORMANCE_PAGE_PATH, updated)
  } else if (actual !== expected) {
    throw new Error(
      'The public bundle-size table differs from baseline.json; run pnpm update:bundle-size-baseline',
    )
  }
}

const args = process.argv.slice(2)
const isCheck = args.includes('--check')
const isUpdate = args.includes('--update')
if (isCheck && isUpdate) {
  throw new Error('Use either --check or --update')
}
if (args.some(arg => arg !== '--check' && arg !== '--update')) {
  throw new Error(`Unknown arguments: ${args.join(' ')}`)
}

const fixtureEntries = []
for (const name of FIXTURES) {
  fixtureEntries.push([name, await profileFixture(name)])
}
const fixtures = Object.fromEntries(fixtureEntries)
const report = {
  schemaVersion: 1,
  fixtures,
}
const currentBaseline = baselineFrom(fixtures)
const treeShakingFailures = assertTreeShaking(fixtures)

await mkdir(dirname(REPORT_PATH), { recursive: true })
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)

for (const name of FIXTURES) {
  const size = fixtures[name].initial.js
  process.stdout.write(
    `${name.padEnd(12)} ${globalThis.String(size.raw).padStart(8)} raw  ${globalThis.String(size.gzip).padStart(7)} gzip  ${globalThis.String(size.brotli).padStart(7)} br\n`,
  )
}
process.stdout.write(`Detailed report: ${relative(REPO_ROOT, REPORT_PATH)}\n`)

if (treeShakingFailures.length > 0) {
  throw new Error(
    `Tree-shaking contracts failed:\n${treeShakingFailures.join('\n')}`,
  )
}

if (isUpdate) {
  await writeFile(
    BASELINE_PATH,
    `${JSON.stringify(currentBaseline, null, 2)}\n`,
  )
  await synchronizePublicTable(currentBaseline, true)
  process.stdout.write('Updated baseline.json\n')
}

if (isCheck) {
  const baseline = JSON.parse(await readFile(BASELINE_PATH, 'utf8'))
  const regressions = compareBaseline(baseline, currentBaseline)
  if (regressions.length > 0) {
    throw new Error(`Bundle-size regressions:\n${regressions.join('\n')}`)
  }
  await synchronizePublicTable(baseline, false)
  process.stdout.write('Bundle-size baseline check passed\n')
}
