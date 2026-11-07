import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const [currentPath, priorPath, expectedCommit, outputPath] = process.argv.slice(2)
assert(currentPath && priorPath && expectedCommit && outputPath, 'Usage: node compare-foldkit-rendering-assets.mjs CURRENT_ARTIFACTS PRIOR_ARTIFACTS FINAL_SHA OUTPUT')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const inventory = (root, relative = '') => readdirSync(join(root, relative), { withFileTypes: true }).flatMap(entry => {
  assert(!entry.isSymbolicLink(), 'Unexpected served artifact symlink')
  const file = join(relative, entry.name)
  return entry.isDirectory() ? inventory(root, file) : [file]
})
const canonical = rows => JSON.stringify([...rows].sort((a, b) => a.file.localeCompare(b.file)))
const inspect = path => {
  const bytes = readFileSync(path)
  const receipt = JSON.parse(bytes)
  const preparationBytes = readFileSync(resolve(dirname(path), receipt.preparation.file))
  assert.equal(sha(preparationBytes), receipt.preparation.sha256)
  const preparation = JSON.parse(preparationBytes)
  for (const [file, expected] of Object.entries(preparation.driver)) {
    assert.equal(sha(readFileSync(join(receipt.driverRoot, file))), expected)
  }
  for (const { file, sha256 } of receipt.harnessFiles) {
    assert.equal(sha(readFileSync(join(receipt.harnessRoot, file))), sha256)
  }
  for (const [slot, value] of Object.entries(receipt.slots)) {
    const root = join(receipt.harnessRoot, 'priv/implementations', slot, 'dist')
    assert.deepEqual(inventory(root).sort(), value.files.map(row => row.file).sort())
    for (const row of value.files) {
      const asset = readFileSync(join(root, row.file))
      assert.equal(sha(asset), row.sha256)
      assert.equal(asset.length, row.bytes)
      assert.equal(gzipSync(asset).length, row.gzipBytes)
    }
  }
  return { receipt, preparation, sha256: sha(bytes) }
}
const current = inspect(resolve(currentPath))
const prior = inspect(resolve(priorPath))
assert.equal(current.receipt.candidateCommit, expectedCommit)
assert.equal(current.receipt.sourceHead, expectedCommit)
assert.equal(current.receipt.mainCommit, prior.receipt.mainCommit)
assert.deepEqual(current.preparation.driver, prior.preparation.driver)
assert.equal(current.preparation.harnessRevision, prior.preparation.harnessRevision)
assert.equal(current.preparation.harnessArchiveSHA256, prior.preparation.harnessArchiveSHA256)
assert.equal(canonical(current.receipt.harnessFiles), canonical(prior.receipt.harnessFiles))
assert.deepEqual(Object.keys(current.receipt.slots).sort(), Object.keys(prior.receipt.slots).sort())
const slots = Object.fromEntries(Object.entries(current.receipt.slots).map(([name, value]) => {
  const previous = prior.receipt.slots[name]
  assert.equal(value.role, previous.role)
  return [name, { role: value.role, byteIdentical: canonical(value.files) === canonical(previous.files), currentFiles: value.files, priorFiles: previous.files }]
}))
const result = {
  status: 'artifact-comparison-only',
  candidateCommit: expectedCommit,
  priorCandidateCommit: prior.receipt.candidateCommit,
  currentArtifactReceipt: { file: resolve(currentPath), sha256: current.sha256 },
  priorArtifactReceipt: { file: resolve(priorPath), sha256: prior.sha256 },
  driverAndHarnessByteIdentical: true,
  allServedSlotAssetsByteIdentical: Object.values(slots).every(slot => slot.byteIdentical),
  slots,
  limitations: ['No new timing or functional-browser evidence is produced by this comparison. Prior timing remains historical; exact served-byte equality can link it to the final candidate. Changed assets require fresh paired measurement.'],
}
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify({ candidateCommit: expectedCommit, allServedSlotAssetsByteIdentical: result.allServedSlotAssetsByteIdentical, outputPath }, null, 2))
