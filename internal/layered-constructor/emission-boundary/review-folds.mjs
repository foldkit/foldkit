import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from '../../../node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/typescript.js'
import { installNormalizedFolds } from './install-normalized-folds.mjs'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = resolve(repository, 'packages/foldkit')
const output = mkdtempSync('/private/tmp/fold-normalization-review-')
const sourceRoot = resolve(output, 'source')
const packageRoot = resolve(output, 'package')
const current = process.env.FOLDKIT_FOLD_REVIEW_CURRENT === '1'
const compiler =
  process.env.FOLDKIT_FOLD_REVIEW_TYPESCRIPT === '6'
    ? resolve(
        repository,
        'node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/tsc.js',
      )
    : resolve(core, 'node_modules/typescript/bin/tsc')
const options = {
  strict: true,
  skipLibCheck: false,
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  target: 'ES2022',
  lib: ['ESNext', 'DOM'],
  types: [],
  verbatimModuleSyntax: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
}
const results = []
const linkedDependencies = (root, pkg) => {
  mkdirSync(resolve(root, 'node_modules'), { recursive: true })
  symlinkSync(pkg, resolve(root, 'node_modules/foldkit'))
  symlinkSync(
    realpathSync(resolve(core, 'node_modules/effect')),
    resolve(root, 'node_modules/effect'),
  )
}
const run = (label, cwd, config, expectedStatus = 0) => {
  const configFile = resolve(cwd, `${label}.json`)
  writeFileSync(configFile, JSON.stringify(config, null, 2))
  const result = spawnSync(
    process.execPath,
    [compiler, '-p', configFile, '--pretty', 'false'],
    { cwd, encoding: 'utf8' },
  )
  const log = (result.stdout ?? '') + (result.stderr ?? '')
  writeFileSync(resolve(output, `${label}.log`), log)
  results.push({
    label,
    status: result.status,
    diagnostics: Object.fromEntries(
      [...log.matchAll(/TS[0-9]+/g)].reduce(
        (counts, [code]) => counts.set(code, (counts.get(code) ?? 0) + 1),
        new Map(),
      ),
    ),
  })
  console.log(results.at(-1))
  if (expectedStatus === 0) {
    assert.equal(result.status, 0, `${label}:\n${log}`)
  } else {
    assert.notEqual(result.status, 0, `${label} unexpectedly passed`)
    assert.match(
      log,
      /TS2344|TS2578/,
      `${label} lacked precision regression diagnostics: ${log}`,
    )
  }
}

mkdirSync(sourceRoot, { recursive: true })
mkdirSync(packageRoot, { recursive: true })
cpSync(resolve(core, 'dist'), resolve(packageRoot, 'dist'), { recursive: true })
cpSync(resolve(core, 'package.json'), resolve(packageRoot, 'package.json'))
mkdirSync(resolve(packageRoot, 'node_modules'))
for (const dependency of ['effect', 'parse5']) {
  symlinkSync(
    realpathSync(resolve(core, 'node_modules', dependency)),
    resolve(packageRoot, 'node_modules', dependency),
  )
}
if (!current) {
  installNormalizedFolds(packageRoot, ts)
}
linkedDependencies(sourceRoot, packageRoot)
writeFileSync(resolve(sourceRoot, 'package.json'), '{"type":"module"}')
const sourceFiles = []
for (const prefix of current
  ? ['outmessage-fold', 'descriptor-fold']
  : ['outmessage-fold']) {
  for (const suffix of ['accepted', 'rejected', 'consume']) {
    const name = `${prefix}.${suffix}.ts`
    cpSync(resolve(core, 'declaration-tests', name), resolve(sourceRoot, name))
    sourceFiles.push(name)
  }
}
if (!current) {
  cpSync(
    resolve(directory, 'fold-parity.fixture.ts'),
    resolve(sourceRoot, 'fold-parity.ts'),
  )
  sourceFiles.push('fold-parity.ts')
}
const accepted = current
  ? ['descriptor-fold.accepted.ts']
  : ['outmessage-fold.accepted.ts', 'fold-parity.ts']
writeFileSync(
  resolve(output, 'metadata.json'),
  JSON.stringify(
    {
      compiler: realpathSync(compiler),
      effect: realpathSync(resolve(core, 'node_modules/effect')),
      normalization: current
        ? 'canonical-descriptor-only'
        : 'copied-descriptor-only',
    },
    null,
    2,
  ) + '\n',
)
run('source', sourceRoot, {
  compilerOptions: { ...options, noEmit: true },
  files: sourceFiles,
})
run('emit', sourceRoot, {
  compilerOptions: {
    ...options,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: 'emitted',
    rootDir: '.',
  },
  files: accepted,
})

const relocated = resolve(output, 'relocated')
mkdirSync(relocated)
const relocatedPackage = resolve(relocated, 'package')
cpSync(packageRoot, relocatedPackage, { recursive: true, dereference: false })
cpSync(resolve(sourceRoot, 'emitted'), resolve(relocated, 'emitted'), {
  recursive: true,
})
linkedDependencies(relocated, relocatedPackage)
writeFileSync(resolve(relocated, 'package.json'), '{"type":"module"}')
const consumers = []
for (const prefix of current
  ? ['outmessage-fold', 'descriptor-fold']
  : ['outmessage-fold']) {
  const name = `${prefix}.consume.ts`
  writeFileSync(
    resolve(relocated, name),
    readFileSync(resolve(sourceRoot, name), 'utf8').replaceAll(
      /'\.\/([^']+\.accepted\.js)'/g,
      "'./emitted/$1'",
    ),
  )
  consumers.push(name)
}
if (!current) {
  writeFileSync(
    resolve(relocated, 'parity-consume.ts'),
    "import type {CallableParity,ResidualParity} from './emitted/fold-parity.js'; export type Proof = readonly[CallableParity,ResidualParity];\n",
  )
  consumers.push('parity-consume.ts')
}
assert(!existsSync(resolve(relocated, 'descriptor-fold.accepted.ts')))
assert(!existsSync(resolve(relocated, 'outmessage-fold.accepted.ts')))
run('relocated', relocated, {
  compilerOptions: { ...options, noEmit: true },
  files: consumers,
})

const relativeFoldPath = current
  ? 'dist/block/outMessageFoldContract.d.ts'
  : 'dist/block/outMessageFold.d.ts'
const foldPath = resolve(relocatedPackage, relativeFoldPath)
const restored = readFileSync(foldPath, 'utf8')
const parsed = ts.createSourceFile(
  foldPath,
  restored,
  ts.ScriptTarget.Latest,
  true,
)
const declaration = parsed.statements.find(
  statement =>
    ts.isTypeAliasDeclaration(statement) &&
    statement.name.text === 'NormalizedFoldStep',
)
assert(declaration)
const outputType = current ? 'RestoredOutput' : 'FoldRestoredOutput'
writeFileSync(
  foldPath,
  restored.slice(0, declaration.type.getStart(parsed)) +
    `Data extends readonly [unknown,infer Graph,...infer OutputData] ? OutMessageFoldStep<Model,${outputType}<Model,OutputData>,Graph> : never` +
    restored.slice(declaration.type.end),
)
run(
  'mutation-ungrouped',
  relocated,
  { compilerOptions: { ...options, noEmit: true }, files: consumers },
  1,
)
writeFileSync(foldPath, restored)

const sourceFoldPath = resolve(packageRoot, relativeFoldPath)
const sourceRestored = readFileSync(sourceFoldPath, 'utf8')
const graph = 'Update.GraphRequirementOf<FunctionValue>'
assert(sourceRestored.includes(graph))
writeFileSync(sourceFoldPath, sourceRestored.replace(graph, 'never'))
run(
  'mutation-graph',
  sourceRoot,
  { compilerOptions: { ...options, noEmit: true }, files: sourceFiles },
  1,
)
writeFileSync(sourceFoldPath, sourceRestored)

if (current) {
  const policyPath = resolve(
    packageRoot,
    'dist/experimental/constructed/bindingContract.d.ts',
  )
  const original = readFileSync(policyPath, 'utf8')
  const policyParsed = ts.createSourceFile(
    policyPath,
    original,
    ts.ScriptTarget.Latest,
    true,
  )
  let guard
  const visit = node => {
    if (
      ts.isConditionalTypeNode(node) &&
      ts.isTypeReferenceNode(node.checkType) &&
      node.checkType.typeName.getText(policyParsed) === 'ExactPolicy' &&
      node.checkType.typeArguments?.[0]?.getText(policyParsed) === 'Fold'
    ) {
      guard = node
    }
    ts.forEachChild(node, visit)
  }
  visit(policyParsed)
  assert(guard)
  writeFileSync(
    policyPath,
    original.slice(0, guard.getStart(policyParsed)) +
      guard.trueType.getText(policyParsed) +
      original.slice(guard.end),
  )
  run(
    'mutation-helper-guard',
    sourceRoot,
    { compilerOptions: { ...options, noEmit: true }, files: sourceFiles },
    1,
  )
  writeFileSync(policyPath, original)
}
run('restored', relocated, {
  compilerOptions: { ...options, noEmit: true },
  files: consumers,
})
writeFileSync(
  resolve(output, 'results.json'),
  JSON.stringify(results, null, 2) + '\n',
)
console.log(output)
