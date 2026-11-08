import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { gunzipSync } from 'node:zlib'

const baselinePath = process.argv[2]
const candidatePath = process.argv[3]
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

assert.equal(
  candidate.deltas.length,
  59,
  'Candidate must retain 60 steady observations',
)
assert.equal(
  baseline.deltas.length,
  59,
  'Baseline must retain 60 steady observations',
)
assert.equal(
  candidate.deltas.every(delta => delta === 1),
  true,
  'Candidate must advance by one tick per rendered frame',
)
assert.equal(
  baseline.deltas.every(delta => delta === 2),
  true,
  'Baseline must reproduce two ticks per rendered frame',
)
assert.equal(candidate.appSha256, baseline.appSha256)
assert.equal(candidate.driverSha256, baseline.driverSha256)
assert.equal(candidate.streamSha256, baseline.streamSha256)
assert.equal(candidate.browserVersion, baseline.browserVersion)
assert.notEqual(candidate.rendererSha256, baseline.rendererSha256)

for (const [receiptPath, capture] of [
  [baselinePath, baseline],
  [candidatePath, candidate],
]) {
  assert.equal(capture.sameFrameCount, 60)
  assert.deepEqual(capture.pendingAfterDisposal, [])
  assert.deepEqual(capture.errors, [])

  for (const kind of ['renderer', 'stream']) {
    const sources = capture.authenticatedSources.filter(
      source => source.kind === kind,
    )
    assert.notEqual(sources.length, 0, 'Both executed modules must be retained')
    const expected =
      kind === 'renderer' ? capture.rendererSha256 : capture.streamSha256

    for (const source of sources) {
      assert.equal(
        source.sourceHashes.includes(expected),
        true,
        'Executed module must map to its exact source',
      )
      const path = join(
        dirname(receiptPath),
        `${kind}-${source.responseSha256}.js`,
      )
      const bytes = existsSync(path)
        ? readFileSync(path)
        : gunzipSync(readFileSync(path + '.gz'))
      assert.equal(hash(bytes), source.responseSha256)
    }
  }
}

process.stdout.write(
  'Authenticated browser cadence and disposal checks passed\n',
)
