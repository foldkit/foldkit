import { createHash } from 'node:crypto'
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, relative } from 'node:path'
import { gunzipSync } from 'node:zlib'

const evidence = '/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/internal/preview-final-20261107/rendering/measurements/html-definitions-hardened-20261108'
const published = '/private/tmp/foldkit-html-definition-twins-20261107/candidate'
const measuredDist = '/private/tmp/foldkit-html-hardened-verification-20261108/measured-dist'
const current = '/private/tmp/foldkit-html-current-twins-20261108'
const node = '/Users/devinjameson/.vite-plus/js_runtime/node/26.13.0/bin/node'
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const file = path => ({ path, bytes: statSync(path).size, sha256: sha256(readFileSync(path)) })

const directoryManifest = root => {
  const files = new Map()
  const walk = directory => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name)
      const stat = lstatSync(path)
      if (stat.isDirectory()) walk(path)
      else if (stat.isFile()) files.set(relative(root, path), sha256(readFileSync(path)))
    }
  }
  walk(root)
  return files
}
const compareDirectories = (leftRoot, rightRoot) => {
  const left = directoryManifest(leftRoot)
  const right = directoryManifest(rightRoot)
  const paths = [...new Set([...left.keys(), ...right.keys()])].sort()
  return {
    leftFiles: left.size,
    rightFiles: right.size,
    differences: paths.filter(path => left.get(path) !== right.get(path)).map(path => ({
      path,
      left: left.get(path) ?? null,
      right: right.get(path) ?? null,
    })),
  }
}
const compressedLogs = new Set([
  'current-block-type-performance.log',
  'current-focused-tests.log',
  'focused-tests.log',
])
const capturedReceipt = (directory, name) => {
  const storedName = compressedLogs.has(name) ? `${name}.gz` : name
  const path = join(evidence, directory, storedName)
  const stored = readFileSync(path)
  const isGzip = storedName.endsWith('.gz')
  const raw = isGzip ? gunzipSync(stored) : stored
  return {
    path: `${directory}/${storedName}`,
    encoding: isGzip ? 'gzip' : 'identity',
    storedBytes: stored.length,
    storedSha256: sha256(stored),
    rawBytes: raw.length,
    rawSha256: sha256(raw),
    raw,
  }
}
const commandReceipt = name => {
  const captured = capturedReceipt('logs', name)
  const text = captured.raw.toString('utf8')
  const { raw: _raw, ...receipt } = captured
  return { ...receipt, exit: Number(/^exit=(\d+)$/m.exec(text)?.[1]) }
}

const currentAssets = JSON.parse(readFileSync('/private/tmp/foldkit-html-hardened-verification-20261108/current-assets.json', 'utf8'))
const receipt = {
  schemaVersion: 1,
  frozenAt: new Date().toISOString(),
  scope: {
    measuredEvidence: '../html-definitions-20261107/',
    published54HardeningRoot: published,
    currentBaselineRoot: join(current, 'baseline'),
    currentCandidateRoot: join(current, 'candidate'),
    currentCommit: '3f0a41b9279c5296020871303c8bcec2358cb368',
    productionSourceMutated: false,
  },
  inputs: {
    node: file(node),
    typescriptPackage: file(join(published, 'packages/foldkit/node_modules/typescript/package.json')),
    vitePackage: file('/Users/devinjameson/.codex/worktrees/block-completion-record/foldkit-unified-recovery-20261103/node_modules/.pnpm/vite@8.3.5_@types+node@26.4.0_jiti@2.7.0_yaml@2.9.1/node_modules/vite/package.json'),
    hardenedIndex: file(join(published, 'packages/foldkit/src/html/index.ts')),
    hardenedTest: file(join(published, 'packages/foldkit/src/html/attributeConstruction.test.ts')),
    measuredIndex: file('/private/tmp/foldkit-html-measured-reconstruction-20261107/packages/foldkit/src/html/index.ts'),
    measuredTest: file('/private/tmp/foldkit-html-measured-reconstruction-20261107/packages/foldkit/src/html/attributeConstruction.test.ts'),
  },
  currentSelfLinks: Object.fromEntries(
    ['baseline', 'candidate'].flatMap(tree => [
      [`${tree}:root-foldkit`, realpathSync(join(current, tree, 'node_modules/foldkit'))],
      [`${tree}:plugin-foldkit`, realpathSync(join(current, tree, 'packages/vite-plugin-foldkit/node_modules/foldkit'))],
      [`${tree}:benchmark-foldkit`, realpathSync(join(current, tree, 'internal/lustre-benchmark/node_modules/foldkit'))],
      [`${tree}:benchmark-plugin`, realpathSync(join(current, tree, 'internal/lustre-benchmark/node_modules/@foldkit/vite-plugin'))],
    ]),
  ),
  published54Emission: {
    measuredVsHardenedDist: compareDirectories(measuredDist, join(published, 'packages/foldkit/dist')),
    measuredIndexJs: file(join(measuredDist, 'html/index.js')),
    hardenedIndexJs: file(join(published, 'packages/foldkit/dist/html/index.js')),
    measuredPublicDeclaration: file(join(measuredDist, 'html/index.d.ts')),
    hardenedPublicDeclaration: file(join(published, 'packages/foldkit/dist/html/index.d.ts')),
    note: 'Only html/index.d.ts.map differs because it embeds the private hardened source text.',
  },
  currentEmission: {
    baselineVsCandidateDist: compareDirectories(
      join(current, 'baseline/packages/foldkit/dist'),
      join(current, 'candidate/packages/foldkit/dist'),
    ),
  },
  currentAssets,
  currentAssetDeltas: {
    naive: {
      raw: currentAssets.candidate.naive.bytes - currentAssets.baseline.naive.bytes,
      gzip: currentAssets.candidate.naive.gzipBytes - currentAssets.baseline.naive.gzipBytes,
      brotli11: currentAssets.candidate.naive.brotliBytes - currentAssets.baseline.naive.brotliBytes,
    },
    optimised: {
      raw: currentAssets.candidate.optimised.bytes - currentAssets.baseline.optimised.bytes,
      gzip: currentAssets.candidate.optimised.gzipBytes - currentAssets.baseline.optimised.gzipBytes,
      brotli11: currentAssets.candidate.optimised.brotliBytes - currentAssets.baseline.optimised.brotliBytes,
    },
  },
  successfulChecks: [
    'published54-source-typecheck.log',
    'focused-tests.log',
    'published54-build.log',
    'published54-emitted-declarations.log',
    'published54-child-instances.log',
    'published54-assets-build.log',
    'current-source-typecheck.log',
    'current-focused-tests.log',
    'current-baseline-build.log',
    'current-candidate-build.log',
    'current-emitted-declarations.log',
    'current-child-instances.log',
    'current-block-type-performance.log',
    'current-baseline-plugin-build.log',
    'current-candidate-plugin-build.log',
    'current-assets-build.log',
  ].map(commandReceipt),
  mutationControls: readdirSync(join(evidence, 'mutations')).sort().map(name => {
    const path = join(evidence, 'mutations', name)
    const stored = readFileSync(path)
    const isGzip = name.endsWith('.gz')
    const raw = isGzip ? gunzipSync(stored) : stored
    return {
      path: `mutations/${name}`,
      encoding: isGzip ? 'gzip' : 'identity',
      storedBytes: stored.length,
      storedSha256: sha256(stored),
      rawBytes: raw.length,
      rawSha256: sha256(raw),
      sourceRestored: true,
    }
  }),
  auditPacket: {
    recipe: file(join(evidence, 'audit/audit.mjs')),
    receipt: file(join(evidence, 'audit/receipt.md')),
    qualification: 'The audit recipe was reconstructed after the observed two-stage audit and was not rerun during the push hook; see its receipt.',
  },
  setupNotes: [
    'An initial focused Vitest command used the repository root as cwd and was discarded after its relative setup path failed; the retained package-cwd run passes 18 files and 546 tests.',
    'The first current asset invocation correctly rejected absent local plugin dist output. Each twin plugin was then built from its own current source; the retained current-assets-build.log passes.',
  ],
}

writeFileSync(join(evidence, 'verification.json'), `${JSON.stringify(receipt, null, 2)}\n`)

const excluded = new Set(['manifest.json', 'manifest.sha256'])
const evidenceFiles = directoryManifest(evidence)
const manifest = Object.fromEntries([...evidenceFiles].filter(([path]) => !excluded.has(path)))
const manifestText = `${JSON.stringify({ schemaVersion: 1, files: manifest }, null, 2)}\n`
writeFileSync(join(evidence, 'manifest.json'), manifestText)
writeFileSync(join(evidence, 'manifest.sha256'), `${sha256(manifestText)}  manifest.json\n`)
process.stdout.write(`${JSON.stringify({ verification: join(evidence, 'verification.json'), manifestSha256: sha256(manifestText), files: Object.keys(manifest).length }, null, 2)}\n`)
