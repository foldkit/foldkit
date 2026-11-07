import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const core = join(repository, 'packages/foldkit')
const artifacts = mkdtempSync(
  '/private/tmp/foldkit-record-completion-performance-',
)
const require = createRequire(join(repository, 'package.json'))
const ts = require('typescript')
const printer = ts.createPrinter({ removeComments: true })
const COMPILER_TIMEOUT_MS = 120_000
const targets = ['workspace-composition-4', 'workspace-composition-8']
const adaptedFiles = [
  'workspace-shared.ts',
  'workspace-groups-4.ts',
  'workspace-groups-8.ts',
  'workspace-composition-4.ts',
  'workspace-composition-8.ts',
]
const bindingFactories = [
  'makeRequiredFieldBinding',
  'makeOptionalFieldBinding',
  'makeOptionalKeyedFieldBinding',
  'makeKeyedArrayBinding',
  'makeRecordBinding',
  'makeHashMapBinding',
  'makeCustomBinding',
  'makeCustomKeyedBinding',
  'makeVariantBinding',
]
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const readJson = path => JSON.parse(readFileSync(path, 'utf8'))
const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
const canonical = node =>
  printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile())
const member = (node, name) =>
  ts.isPropertyAccessExpression(node) && node.name.text === name
const walkFiles = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? walkFiles(join(directory, entry.name))
      : [join(directory, entry.name)],
  )
const inventory = directory =>
  walkFiles(directory)
    .map(path => ({
      file: path.slice(directory.length + 1),
      sha256: sha256(readFileSync(path)),
    }))
    .sort((left, right) => (left.file < right.file ? -1 : 1))
const digest = entries =>
  sha256(entries.map(({ file, sha256 }) => `${file}\0${sha256}\n`).join(''))
const linkDependency = (root, name, target) => {
  const link = join(root, 'node_modules', name)
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(realpathSync(target), link)
}
const countAssertions = parsed => {
  let count = 0
  const visit = node => {
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === 'Expect'
    ) {
      count += 1
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  return count
}

const recordVariant = (source, file) => {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const edits = []
  const propertiesBefore = []
  const visit = node => {
    if (ts.isCallExpression(node) && member(node.expression, 'makeLayer')) {
      assert.equal(node.arguments.length, 1)
      const [constructor] = node.arguments
      assert(ts.isCallExpression(constructor))
      let body

      if (member(constructor.expression, 'succeed')) {
        ;[body] = constructor.arguments
      } else {
        assert(member(constructor.expression, 'gen'))
        const [generator] = constructor.arguments
        assert(ts.isFunctionExpression(generator) && generator.asteriskToken)
        const statements = [...generator.body.statements]
        const final = statements.pop()
        assert(ts.isReturnStatement(final))
        body = final.expression
        assert(statements.every(ts.isVariableStatement))
      }

      assert(ts.isObjectLiteralExpression(body))
      const children = body.properties.filter(
        property => property.name?.getText(parsed) === 'children',
      )
      assert.equal(children.length, 1)
      const properties = body.properties.filter(
        property => property.name?.getText(parsed) !== 'children',
      )
      propertiesBefore.push(properties.map(canonical))
      edits.push({
        start: constructor.getStart(parsed),
        end: constructor.end,
        text: `{ ${properties.map(property => property.getText(parsed)).join(', ')} }`,
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)

  let output = source
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  const next = ts.createSourceFile(file, output, ts.ScriptTarget.Latest, true)
  const propertiesAfter = []
  const inspect = node => {
    if (ts.isCallExpression(node) && member(node.expression, 'makeLayer')) {
      const [record] = node.arguments
      assert(ts.isObjectLiteralExpression(record))
      assert(
        !record.properties.some(
          property => property.name?.getText(next) === 'children',
        ),
      )
      propertiesAfter.push(record.properties.map(canonical))
    }
    ts.forEachChild(node, inspect)
  }
  inspect(next)
  assert.deepEqual(propertiesAfter, propertiesBefore, `${file}: changed body`)
  assert.equal(countAssertions(next), countAssertions(parsed))

  return {
    output,
    facts: {
      file,
      recordCompletions: edits.length,
      preservedProperties: propertiesBefore.reduce(
        (sum, properties) => sum + properties.length,
        0,
      ),
      retainedAssertions: countAssertions(next),
    },
  }
}

const sourceInputs = inventory(join(core, 'type-performance'))
const distributionInputs = inventory(join(core, 'dist'))
const checker = readFileSync(
  join(core, 'scripts/check-block-type-performance.ts'),
)
const compiler = realpathSync(join(core, 'node_modules/typescript/bin/tsc'))
const snapshot = join(artifacts, 'package-core')
cpSync(join(core, 'dist'), join(snapshot, 'dist'), { recursive: true })
cpSync(join(core, 'package.json'), join(snapshot, 'package.json'))
assert.deepEqual(inventory(join(snapshot, 'dist')), distributionInputs)
for (const name of ['effect', 'parse5', '@effect/platform-browser']) {
  linkDependency(snapshot, name, join(core, 'node_modules', name))
}

const originalAdapter = readFileSync(
  join(repository, 'internal/direct-block-performance/adapt.mjs'),
  'utf8',
)
const factoryGuard = "member(value.expression, 'makeBinding')"
assert.equal(originalAdapter.split(factoryGuard).length, 2)
assert.equal(originalAdapter.split('`Init: Schema.Tuple').length, 2)
const adapter = originalAdapter
  .replace('`Init: Schema.Tuple', '`InitArgs: Schema.Tuple')
  .replace(
    factoryGuard,
    `(${JSON.stringify(bindingFactories)}).some(name => member(value.expression, name))`,
  )
const adapterDirectory = join(artifacts, 'internal/direct-block-performance')
mkdirSync(adapterDirectory, { recursive: true })
mkdirSync(join(artifacts, 'packages/foldkit'), { recursive: true })
symlinkSync(
  join(core, 'node_modules'),
  join(artifacts, 'packages/foldkit/node_modules'),
)
writeFileSync(join(adapterDirectory, 'adapt.mjs'), adapter)
const { adapt } = await import(
  pathToFileURL(join(adapterDirectory, 'adapt.mjs'))
)
const variants = new Map()
const transformations = []
for (const file of adaptedFiles) {
  const source = readFileSync(join(core, 'type-performance', file), 'utf8')
  const manual = adapt(source, file)
  const record = recordVariant(manual.output, file)
  variants.set(file, { manual: manual.output, record: record.output })
  transformations.push({
    originalToManual: manual.facts,
    manualToRecord: record.facts,
    originalSha256: sha256(source),
    manualSha256: sha256(manual.output),
    recordSha256: sha256(record.output),
  })
}

const prepareProject = (name, packageSnapshot, mode) => {
  const root = join(artifacts, name)
  cpSync(join(core, 'type-performance'), join(root, 'type-performance'), {
    recursive: true,
  })
  mkdirSync(join(root, 'scripts'))
  writeFileSync(join(root, 'scripts/check-block-type-performance.ts'), checker)
  cpSync(join(core, 'package.json'), join(root, 'package.json'))
  symlinkSync(join(packageSnapshot, 'dist'), join(root, 'dist'))
  linkDependency(root, 'foldkit', packageSnapshot)
  linkDependency(root, 'effect', join(core, 'node_modules/effect'))
  const bin = join(root, 'node_modules/.bin')
  mkdirSync(bin, { recursive: true })
  const quote = text => `'${text.replaceAll("'", "'\\''")}'`
  const wrapper = join(bin, 'tsc')
  writeFileSync(
    wrapper,
    `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(compiler)} "$@"\n`,
  )
  chmodSync(wrapper, 0o755)
  for (const [file, values] of variants) {
    writeFileSync(join(root, 'type-performance', file), values[mode])
  }
  for (const file of [
    'baseline.ts',
    'budgets.json',
    'fixtures.json',
    'tsconfig.json',
  ]) {
    assert.equal(
      sha256(readFileSync(join(root, 'type-performance', file))),
      sha256(readFileSync(join(core, 'type-performance', file))),
    )
  }
  return root
}

mkdirSync(join(artifacts, 'logs'))
const measurements = []
const controls = []
const inputInventoryPath = join(artifacts, 'input-inventories.json')
writeJson(inputInventoryPath, { sourceInputs, distributionInputs })
const inputs = {
  inventoryFile: inputInventoryPath,
  inventorySha256: sha256(readFileSync(inputInventoryPath)),
  sourceCount: sourceInputs.length,
  sourceSha256: digest(sourceInputs),
  distributionCount: distributionInputs.length,
  distributionSha256: digest(distributionInputs),
  budgetsSha256: sha256(
    readFileSync(join(core, 'type-performance/budgets.json')),
  ),
  checkerSha256: sha256(checker),
  originalAdapterSha256: sha256(originalAdapter),
  adaptedAdapterSha256: sha256(adapter),
  compilerSha256: sha256(readFileSync(compiler)),
}
const receipt = () => ({
  repository,
  artifacts,
  node: process.version,
  compiler: readJson(join(core, 'node_modules/typescript/package.json'))
    .version,
  parser: ts.version,
  scriptSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
  inputs,
  transformations,
  measurements,
  controls,
})
const saveReceipt = extra =>
  writeJson(join(artifacts, 'receipt.json'), { ...receipt(), ...extra })
const measure = (root, mode, fixture) => {
  const command = [
    join(root, 'scripts/check-block-type-performance.ts'),
    fixture,
  ]
  const startedAt = new Date().toISOString()
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: COMPILER_TIMEOUT_MS,
    env: { ...process.env, NODE_DISABLE_COMPILE_CACHE: '1' },
  })
  assert.ifError(result.error)
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const log = join(artifacts, 'logs', `${mode}-${fixture}.log`)
  writeFileSync(log, output)
  const row = [
    ...output.matchAll(
      /^(\S+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(ok|failed[^\n]*)[ \t]*$/gm,
    ),
  ].at(-1)
  if (row !== undefined) {
    assert.equal(row.at(1), fixture)
  }
  const metric = index => Number(row.at(index).replaceAll(',', ''))
  return {
    mode,
    fixture,
    startedAt,
    completedAt: new Date().toISOString(),
    status: result.status,
    command: [process.execPath, ...command],
    log,
    logSha256: sha256(output),
    ...(row === undefined
      ? { diagnosticFailure: true }
      : {
          instantiations: metric(2),
          maxInstantiations: metric(3),
          types: metric(4),
          maxTypes: metric(5),
          symbols: metric(6),
          budgetStatus: row.at(7),
        }),
  }
}

saveReceipt({ status: 'running' })
const projects = new Map(
  ['manual', 'record'].map(mode => [
    mode,
    prepareProject(mode, snapshot, mode),
  ]),
)
for (const fixture of targets) {
  for (const mode of ['manual', 'record']) {
    const result = measure(projects.get(mode), mode, fixture)
    measurements.push(result)
    saveReceipt({ status: 'running' })
    assert(!result.diagnosticFailure, `Source did not compile: ${result.log}`)
    console.log(
      mode,
      fixture,
      `${result.instantiations} instantiations / ${result.types} Types; ${result.budgetStatus}`,
    )
  }
}

const declarationFile = 'experimental/contracted/unified.d.ts'
const originalDeclaration = readFileSync(
  join(snapshot, 'dist', declarationFile),
  'utf8',
)
const parsedDeclaration = ts.createSourceFile(
  declarationFile,
  originalDeclaration,
  ts.ScriptTarget.Latest,
  true,
)
const makeLayer = parsedDeclaration.statements.find(
  statement =>
    ts.isInterfaceDeclaration(statement) && statement.name.text === 'MakeLayer',
)
assert(makeLayer)
const recordSignatures = makeLayer.members.filter(
  signature =>
    ts.isCallSignatureDeclaration(signature) &&
    signature.typeParameters?.some(
      parameter => parameter.name.text === 'Record',
    ),
)
assert.equal(recordSignatures.length, 1)
const [recordSignature] = recordSignatures
const removedOverloadDeclaration =
  originalDeclaration.slice(0, recordSignature.getStart(parsedDeclaration)) +
  originalDeclaration.slice(recordSignature.end)
const controlSnapshot = join(artifacts, 'package-no-record-overload')
cpSync(join(snapshot, 'dist'), join(controlSnapshot, 'dist'), {
  recursive: true,
})
cpSync(join(snapshot, 'package.json'), join(controlSnapshot, 'package.json'))
symlinkSync(
  join(snapshot, 'node_modules'),
  join(controlSnapshot, 'node_modules'),
)
writeFileSync(
  join(controlSnapshot, 'dist', declarationFile),
  removedOverloadDeclaration,
)
controls.push({
  mutation:
    'Remove only the ordinary MakeLayer record overload in a separate declaration copy',
  file: declarationFile,
  originalSha256: sha256(originalDeclaration),
  mutatedSha256: sha256(removedOverloadDeclaration),
})
const recordControlRoot = prepareProject(
  'record-no-overload',
  controlSnapshot,
  'record',
)
const rejectedRecord = measure(
  recordControlRoot,
  'record-no-overload',
  targets.at(0),
)
const rejectionOutput = readFileSync(rejectedRecord.log, 'utf8')
assert(rejectedRecord.diagnosticFailure)
assert.notEqual(rejectedRecord.status, 0)
const expectedRecordCalls = transformations
  .filter(({ manualToRecord }) =>
    [
      'workspace-shared.ts',
      'workspace-groups-4.ts',
      'workspace-composition-4.ts',
    ].includes(manualToRecord.file),
  )
  .reduce(
    (sum, { manualToRecord }) => sum + manualToRecord.recordCompletions,
    0,
  )
assert.equal(
  [...rejectionOutput.matchAll(/error TS2345:/g)].length,
  expectedRecordCalls,
)
controls.push({
  ...rejectedRecord,
  expectedRejectedRecordCalls: expectedRecordCalls,
})
const manualControlRoot = prepareProject(
  'manual-no-overload',
  controlSnapshot,
  'manual',
)
for (const fixture of targets) {
  const result = measure(manualControlRoot, 'manual-no-overload', fixture)
  assert(!result.diagnosticFailure)
  controls.push(result)
}

assert.deepEqual(inventory(join(core, 'type-performance')), sourceInputs)
assert.deepEqual(inventory(join(core, 'dist')), distributionInputs)
assert.deepEqual(inventory(join(snapshot, 'dist')), distributionInputs)
assert.equal(
  sha256(readFileSync(join(core, 'scripts/check-block-type-performance.ts'))),
  inputs.checkerSha256,
)
saveReceipt({
  status: 'complete',
  originalSourcesUnchanged: true,
  frameworkDistUnchanged: true,
  activeRecordOverloadProved: true,
  budgetPolicy:
    'Unchanged native ceilings remain reported. A canonical baseline overrun is not a new accepted budget.',
})
console.log(join(artifacts, 'receipt.json'))
process.exitCode = measurements.every(result => result.status === 0) ? 0 : 1
