import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const NODE =
  '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node'
const NODE_SHA256 =
  '533bd644c5ae0e0ea3a80e433aad16b817447ccba1e1eea701875eac80cb75d4'
const WORK = '/private/tmp/foldkit-official-workcount-cpu-20261107'
const PREVIEW_ROOT =
  '/private/tmp/foldkit-bundle-invocation-controls-20261107/d_retargeted'
const MAIN_ROOT = '/private/tmp/foldkit-unified-rendering-20261104/main'
const OFFICIAL_ROOT =
  '/private/tmp/foldkit-record-release-rendering-xpwmm820'
const PREVIEW_OUTPUT = join(WORK, 'maps-preview-optimised')
const MAIN_OUTPUT = join(WORK, 'maps-main-naive')

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const expected = {
  previewOptimised: {
    bytes: 482112,
    sha256:
      'c6802c60c7eccbfb7bbd04f760bb0a9e8e7fc3db2f4945edcf880cca340036ce',
    official: join(
      OFFICIAL_ROOT,
      'harness/priv/implementations/foldkit-preview-final-optimised/dist/assets/index.optimised-4XrqNWmx.js',
    ),
  },
  mainNaive: {
    bytes: 304187,
    sha256:
      'd3e37e9f695531f98727dadc3ead8bddd4b0bdb93f52b64029880c3d7a78adb4',
    official: join(
      OFFICIAL_ROOT,
      'harness/priv/implementations/foldkit-main/dist/assets/index-DN9U5aN7.js',
    ),
  },
}

assert.equal(sha256(readFileSync(NODE)), NODE_SHA256)
assert(!existsSync(PREVIEW_OUTPUT), `Refusing to overwrite ${PREVIEW_OUTPUT}`)
assert(!existsSync(MAIN_OUTPUT), `Refusing to overwrite ${MAIN_OUTPUT}`)

const linkFacts = [
  ['node_modules/foldkit', 'packages/foldkit'],
  [
    'internal/lustre-benchmark/node_modules/@foldkit/vite-plugin',
    'packages/vite-plugin-foldkit',
  ],
  ['internal/lustre-benchmark/node_modules/foldkit', 'packages/foldkit'],
  ['packages/vite-plugin-foldkit/node_modules/foldkit', 'packages/foldkit'],
].map(([link, target]) => {
  const linkPath = join(PREVIEW_ROOT, link)
  assert(lstatSync(linkPath).isSymbolicLink(), `${link} is not a symlink`)
  const actual = realpathSync(linkPath)
  const expectedTarget = realpathSync(join(PREVIEW_ROOT, target))
  assert.equal(actual, expectedTarget)
  assert(
    relative(realpathSync(PREVIEW_ROOT), actual).split('/')[0] !== '..',
    `${link} escapes the self-contained preview root`,
  )
  return { link, target, actual }
})

for (const facts of Object.values(expected)) {
  const bytes = readFileSync(facts.official)
  assert.equal(bytes.length, facts.bytes)
  assert.equal(sha256(bytes), facts.sha256)
}

const build = ({ root, output, variant }) => {
  const cwd = join(root, 'internal/lustre-benchmark')
  const vite = join(cwd, 'node_modules/vite/bin/vite.js')
  assert(statSync(vite).isFile(), `Missing Vite executable: ${vite}`)
  const env = { ...process.env }
  for (const key of ['NODE_ENV', 'VITE_USER_NODE_ENV', 'MODE', 'BUILD_VARIANT']) {
    delete env[key]
  }
  Object.assign(env, {
    CI: '1',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    NO_COLOR: '1',
  })
  if (variant) env.BUILD_VARIANT = variant
  const args = [
    vite,
    'build',
    '--mode',
    'production',
    '--sourcemap',
    'hidden',
    '--outDir',
    output,
  ]
  const result = spawnSync(NODE, args, { cwd, env, stdio: 'inherit' })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0)
  return { cwd, executable: NODE, args, variant: variant ?? 'naive' }
}

mkdirSync(WORK, { recursive: true })
const invocations = [
  build({
    root: PREVIEW_ROOT,
    output: PREVIEW_OUTPUT,
    variant: 'optimised',
  }),
  build({ root: MAIN_ROOT, output: MAIN_OUTPUT }),
]

const walk = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })

const inspectTwin = (output, facts) => {
  const files = walk(output)
  const javascript = files.filter(path => path.endsWith('.js'))
  const maps = files.filter(path => path.endsWith('.js.map'))
  assert.equal(javascript.length, 1)
  assert.equal(maps.length, 1)
  const javascriptBytes = readFileSync(javascript[0])
  const officialBytes = readFileSync(facts.official)
  assert.equal(javascriptBytes.length, facts.bytes)
  assert.equal(sha256(javascriptBytes), facts.sha256)
  assert.deepEqual(javascriptBytes, officialBytes)
  const mapBytes = readFileSync(maps[0])
  const map = JSON.parse(mapBytes)
  assert(Array.isArray(map.sources) && map.sources.length > 0)
  assert.equal(map.sources.length, map.sourcesContent?.length)
  return {
    javascript: {
      path: javascript[0],
      bytes: javascriptBytes.length,
      sha256: sha256(javascriptBytes),
      officialByteIdentical: true,
    },
    sourceMap: {
      path: maps[0],
      bytes: mapBytes.length,
      sha256: sha256(mapBytes),
      sources: map.sources.length,
      hasEverySourceContent: map.sourcesContent.every(
        content => typeof content === 'string',
      ),
    },
  }
}

const retainedMaps = {
  mainOptimised: {
    javascript:
      '/private/tmp/foldkit-unified-profile-20261104/maps-main/assets/index.optimised-UkWhNSKN.js',
    javascriptSha256:
      '852eddbf31ec2d3274568f1f0d503dfeabc6e181c8d2361489b435b13ce14ded',
    sourceMap:
      '/private/tmp/foldkit-unified-profile-20261104/maps-main/assets/index.optimised-UkWhNSKN.js.map',
    sourceMapSha256:
      '9d632a69c71bc066080470498aa7eab3bd60388caf1e242dd07542e65bc8710a',
  },
  previewNaive: {
    javascript:
      '/private/tmp/foldkit-bundle-invocation-controls-20261107/d_retargeted/internal/lustre-benchmark/dist-map/naive/assets/index-ZmDGH17y.js',
    javascriptSha256:
      '445b31212df9efe25ce6e81fe60cb7a5dfc583c46fc098dd84de40e234e9d146',
    sourceMap:
      '/private/tmp/foldkit-bundle-invocation-controls-20261107/d_retargeted/internal/lustre-benchmark/dist-map/naive/assets/index-ZmDGH17y.js.map',
    sourceMapSha256:
      '4ded625981064248a1f3ac38e980d563d3dcc1b94da34770cc06afc25dd41616',
  },
}
for (const facts of Object.values(retainedMaps)) {
  assert.equal(sha256(readFileSync(facts.javascript)), facts.javascriptSha256)
  assert.equal(sha256(readFileSync(facts.sourceMap)), facts.sourceMapSha256)
}

const receipt = {
  schemaVersion: 1,
  status: 'complete',
  createdAt: new Date().toISOString(),
  node: { executable: NODE, sha256: NODE_SHA256 },
  sourceIdentities: {
    actualMainCommit: 'a471adb24d750ab9e8d8312edad53ff6f26d961b',
    publishedPreviewCommit: '54f8bcd443b4fd18952403a3d02e212abf872d58',
    retainedPreviewSourceHead: '1117a93316ff8111d402bffc995067476ec97983',
  },
  linkFacts,
  invocations,
  previewOptimised: inspectTwin(PREVIEW_OUTPUT, expected.previewOptimised),
  mainNaive: inspectTwin(MAIN_OUTPUT, expected.mainNaive),
  retainedExactMaps: retainedMaps,
}

writeFileSync(
  join(WORK, 'map-preparation-receipt.json'),
  `${JSON.stringify(receipt, null, 2)}\n`,
  { flag: 'wx' },
)
console.log('Exact optimized-preview and naive-main map twins prepared')
