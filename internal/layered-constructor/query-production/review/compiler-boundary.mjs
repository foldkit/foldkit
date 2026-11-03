import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const review = dirname(fileURLToPath(import.meta.url))
const repository = resolve(review, '../../../..')
const framework = join(repository, 'packages/foldkit')
const require = createRequire(join(repository, 'package.json'))
const typescript = require('typescript')
const verification = resolve(review, '../verification')
mkdirSync(verification, { recursive: true })
const workspace = mkdtempSync(join(verification, 'compiler-boundary-'))
const packagePath = join(workspace, 'package')

for (const directory of ['dist', 'declaration-tests', 'type-performance']) {
  cpSync(join(framework, directory), join(packagePath, directory), {
    recursive: true,
  })
}
cpSync(join(framework, 'package.json'), join(packagePath, 'package.json'))
symlinkSync(join(framework, 'node_modules'), join(packagePath, 'node_modules'))

const measure = (label, file = 'machine-search.ts') => {
  const config = join(workspace, 'measure.json')
  writeFileSync(
    config,
    JSON.stringify({
      extends: join(packagePath, 'type-performance/tsconfig.json'),
      files: [join(packagePath, 'type-performance', file)],
      include: [],
      compilerOptions: {
        incremental: false,
        composite: false,
        noEmit: true,
      },
    }),
  )
  const result = spawnSync(
    process.execPath,
    [
      join(framework, 'node_modules/typescript/bin/tsc'),
      '-p',
      config,
      '--extendedDiagnostics',
      '--noEmit',
      '--pretty',
      'false',
    ],
    { cwd: packagePath, encoding: 'utf8' },
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(workspace, `${label}.log`), output)
  assert.ifError(result.error)
  assert.equal(result.status, 0, output)

  const metric = name => {
    const value = output.match(new RegExp(`^${name}:\\s*(\\d+)`, 'm'))
    assert.notEqual(value, null)
    return Number(value?.at(1))
  }

  return { instantiations: metric('Instantiations'), types: metric('Types') }
}

const baseline = measure('baseline', 'baseline.ts')
const delta = metric => ({
  instantiations: metric.instantiations - baseline.instantiations,
  types: metric.types - baseline.types,
})
const budgets = JSON.parse(
  readFileSync(join(packagePath, 'type-performance/budgets.json'), 'utf8'),
).fixtures['machine-search']
const withinBudget = metric =>
  metric.instantiations <= budgets.maxInstantiationsDelta &&
  metric.types <= budgets.maxTypesDelta

const named = delta(measure('named'))
assert.ok(withinBudget(named), JSON.stringify(named))

const target = join(
  packagePath,
  'dist/experimental/query/keyedQueryDefinition.d.ts',
)
const original = readFileSync(target, 'utf8')
const ast = typescript.createSourceFile(
  target,
  original,
  typescript.ScriptTarget.Latest,
  true,
)
const recipes = new Map([
  ['makeNotifyingKeyedQueryAuthoring', 'defineKeyedQuery'],
  ['makeSilentKeyedQueryAuthoring', 'defineSilentKeyedQuery'],
])
const authoring = new Set(['KeyedQueryAuthoring', 'SilentKeyedQueryAuthoring'])
const edits = []

for (const statement of ast.statements) {
  if (typescript.isVariableStatement(statement)) {
    const declaration = statement.declarationList.declarations.at(0)
    const name = declaration?.name.getText(ast)

    if (recipes.has(name)) {
      edits.push({
        start: statement.getStart(ast),
        end: statement.end,
        text: statement
          .getText(ast)
          .replace('declare const', 'export declare const')
          .replace(name, recipes.get(name)),
      })
    } else if (Array.from(recipes.values()).includes(name)) {
      edits.push({
        start: statement.getStart(ast),
        end: statement.end,
        text: '',
      })
    }
  } else if (
    typescript.isInterfaceDeclaration(statement) &&
    authoring.has(statement.name.text)
  ) {
    const parameters = statement.typeParameters.map(value => value.getText(ast))
    let output = statement.heritageClauses.at(0).types.at(0).getText(ast)

    for (const [recipe, exported] of recipes) {
      output = output.replace(recipe, exported)
    }

    edits.push({
      start: statement.getStart(ast),
      end: statement.end,
      text: `export type ${statement.name.text}<${parameters.join(', ')}> = ${output};`,
    })
  }
}

assert.equal(edits.length, 6)
let inline = original
for (const edit of edits.sort((left, right) => right.start - left.start)) {
  inline = inline.slice(0, edit.start) + edit.text + inline.slice(edit.end)
}

writeFileSync(target, inline)
const unnamed = delta(measure('inline-control'))
assert.ok(!withinBudget(unnamed), JSON.stringify(unnamed))
writeFileSync(target, original)
const restored = delta(measure('restored'))
assert.deepEqual(restored, named)
writeFileSync(
  join(workspace, 'results.json'),
  JSON.stringify({ named, unnamed, restored, budgets }, null, 2),
)
console.log(
  `Named authoring boundary and regression control passed: ${workspace}`,
)
