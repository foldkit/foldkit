import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
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
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = resolve(repository, 'packages/foldkit')
const compiler = resolve(core, 'node_modules/typescript/bin/tsc')
const require = createRequire(resolve(core, 'package.json'))
const ts = require(
  resolve(
    repository,
    'node_modules/.pnpm/typescript@6.0.3/node_modules/typescript',
  ),
)
const output = mkdtempSync(resolve(directory, 'binding-parity-'))
const workspace = resolve(output, 'source')
const packageDirectory = resolve(workspace, 'package')
const manifest = JSON.parse(readFileSync(resolve(core, 'package.json'), 'utf8'))
const results = []

function packageHash() {
  const hash = createHash('sha256')
  const root = resolve(core, 'dist')
  function visit(directory_) {
    for (const entry of readdirSync(directory_, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    )) {
      const file = resolve(directory_, entry.name)
      if (entry.isDirectory()) visit(file)
      else hash.update(file.slice(root.length)).update(readFileSync(file))
    }
  }
  visit(root)
  return hash.digest('hex')
}

const originalPackageHash = packageHash()
mkdirSync(packageDirectory, { recursive: true })
cpSync(resolve(core, 'dist'), resolve(packageDirectory, 'dist'), {
  recursive: true,
})
copyFileSync(
  resolve(core, 'package.json'),
  resolve(packageDirectory, 'package.json'),
)

function dependencies(packageRoot) {
  mkdirSync(resolve(packageRoot, 'node_modules'), { recursive: true })
  for (const dependency of ['effect', 'parse5']) {
    symlinkSync(
      realpathSync(resolve(core, 'node_modules', dependency)),
      resolve(packageRoot, 'node_modules', dependency),
    )
  }
}

dependencies(packageDirectory)
const fixture = readFileSync(
  resolve(directory, 'binding-spec-parity.ts'),
  'utf8',
)
const fixtureSource = ts.createSourceFile(
  'binding-spec-parity.ts',
  fixture,
  ts.ScriptTarget.Latest,
  true,
)
writeFileSync(resolve(workspace, 'binding-spec-parity.ts'), fixture)

function paths(packageRoot) {
  return Object.fromEntries(
    Object.entries(manifest.exports).map(([name, entry]) => [
      name === '.' ? 'foldkit' : 'foldkit/' + name.slice(2),
      [resolve(packageRoot, entry.types)],
    ]),
  )
}

function config(file, root, packageRoot, files, options = {}) {
  writeFileSync(
    file,
    JSON.stringify(
      {
        extends: resolve(repository, 'tsconfig.base.json'),
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          rootDir: root,
          skipLibCheck: false,
          noEmit: true,
          paths: paths(packageRoot),
          ...options,
        },
        files,
        include: [],
      },
      null,
      2,
    ) + '\n',
  )
}

const sourceConfig = resolve(workspace, 'source.json')
config(sourceConfig, workspace, packageDirectory, [
  resolve(workspace, 'binding-spec-parity.ts'),
])

function run(name, configFile, expected, witness) {
  const child = spawnSync(
    process.execPath,
    [compiler, '-p', configFile, '--pretty', 'false'],
    { cwd: repository, encoding: 'utf8' },
  )
  const log = (child.stdout ?? '') + (child.stderr ?? '')
  writeFileSync(resolve(output, name + '.log'), log)
  if (expected === 'pass')
    assert.equal(child.status, 0, name + ' failed: ' + log)
  else {
    assert.equal(child.status, 2, name + ' did not fail through TypeScript')
    const declaration = fixtureSource.statements.find(
      statement =>
        ts.isTypeAliasDeclaration(statement) && statement.name.text === witness,
    )
    assert(declaration, witness + ' is missing')
    const value = declaration.type.typeArguments[0]
    const line =
      fixtureSource.getLineAndCharacterOfPosition(value.getStart(fixtureSource))
        .line + 1
    assert(
      log.includes(`binding-spec-parity.ts(${line},`) && log.includes('TS2344'),
      name + ' failed away from its intended parity witness: ' + log,
    )
  }
  results.push({ name, status: child.status, expected })
}

function rewrite(text, edits) {
  for (const edit of edits.sort((left, right) => right.start - left.start))
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end)
  return text
}

try {
  run('source', sourceConfig, 'pass')
  const helper = resolve(
    packageDirectory,
    'dist/experimental/constructed/bindingContract.d.ts',
  )
  const original = readFileSync(helper, 'utf8')
  for (const [name, witness] of [
    ['undistributed-union', 'ConditionalFields'],
    ['forced-readonly', 'MutableInventory'],
    ['wrong-message-free-parent', 'SilentParentMessageIsNever'],
    ['lost-child-policy-distribution', 'NotifyingPolicyRequired'],
  ]) {
    const source = ts.createSourceFile(
      helper,
      original,
      ts.ScriptTarget.Latest,
      true,
    )
    const edits = []
    for (const statement of source.statements) {
      if (
        name === 'undistributed-union' &&
        ts.isTypeAliasDeclaration(statement) &&
        ['BindingSpecOf', 'BindingFromSpec'].includes(statement.name.text)
      ) {
        assert(ts.isConditionalTypeNode(statement.type))
        for (const node of [
          statement.type.checkType,
          statement.type.extendsType,
        ])
          edits.push({
            start: node.getStart(source),
            end: node.end,
            text: '[' + node.getText(source) + ']',
          })
      }
      if (
        name === 'forced-readonly' &&
        ts.isTypeAliasDeclaration(statement) &&
        ['BindingSpecs', 'BindingsFromSpecs'].includes(statement.name.text)
      ) {
        assert(ts.isMappedTypeNode(statement.type))
        const start = statement.type.typeParameter.getStart(source) - 1
        assert.equal(original.at(start), '[')
        edits.push({ start, end: start, text: 'readonly ' })
      }
      if (
        name === 'lost-child-policy-distribution' &&
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === 'DescriptorBinding'
      ) {
        assert(ts.isConditionalTypeNode(statement.type))
        for (const node of [
          statement.type.checkType,
          statement.type.extendsType,
        ])
          edits.push({
            start: node.getStart(source),
            end: node.end,
            text: '[' + node.getText(source) + ']',
          })
      }
      if (
        name === 'wrong-message-free-parent' &&
        ts.isInterfaceDeclaration(statement) &&
        statement.name.text === 'ParentDescriptorBindingFields'
      ) {
        const parent = statement.heritageClauses
          .flatMap(clause => clause.types)
          .find(
            type => type.expression.getText(source) === 'ParentBindingContract',
          )
        assert(parent)
        const message = parent.typeArguments[1]
        edits.push({
          start: message.getStart(source),
          end: message.end,
          text: "MessageSchema['Type']",
        })
      }
    }
    assert.equal(
      edits.length,
      name === 'undistributed-union'
        ? 4
        : name === 'forced-readonly' ||
            name === 'lost-child-policy-distribution'
          ? 2
          : 1,
    )
    try {
      writeFileSync(helper, rewrite(original, edits))
      run(name, sourceConfig, 'fail', witness)
    } finally {
      writeFileSync(helper, original)
    }
  }
  run('restored', sourceConfig, 'pass')

  const emitConfig = resolve(workspace, 'emit.json')
  const emitted = resolve(workspace, 'emitted')
  config(
    emitConfig,
    workspace,
    packageDirectory,
    [resolve(workspace, 'binding-spec-parity.ts')],
    {
      noEmit: false,
      declaration: true,
      declarationMap: false,
      emitDeclarationOnly: true,
      outDir: emitted,
    },
  )
  run('emit', emitConfig, 'pass')

  const relocated = resolve(output, 'relocated')
  const relocatedPackage = resolve(relocated, 'package')
  mkdirSync(relocatedPackage, { recursive: true })
  cpSync(resolve(packageDirectory, 'dist'), resolve(relocatedPackage, 'dist'), {
    recursive: true,
  })
  copyFileSync(
    resolve(packageDirectory, 'package.json'),
    resolve(relocatedPackage, 'package.json'),
  )
  dependencies(relocatedPackage)
  copyFileSync(
    resolve(emitted, 'binding-spec-parity.d.ts'),
    resolve(relocated, 'binding-spec-parity.d.ts'),
  )
  writeFileSync(
    resolve(relocated, 'consumer.ts'),
    "import type * as Proof from './binding-spec-parity.js'\nexport type Validated = Proof.AllSourceMembers & Proof.ConditionalFields & Proof.MutableInventory & Proof.SilentFields & Proof.SilentParentMessageIsNever & Proof.ContextualFields & Proof.NotifyingPolicyRequired & Proof.SilentPolicyIsNever\n",
  )
  const relocatedConfig = resolve(relocated, 'tsconfig.json')
  config(relocatedConfig, relocated, relocatedPackage, [
    resolve(relocated, 'consumer.ts'),
  ])
  run('relocated', relocatedConfig, 'pass')
  const listing = spawnSync(
    process.execPath,
    [compiler, '-p', relocatedConfig, '--listFilesOnly'],
    { cwd: relocated, encoding: 'utf8' },
  )
  assert.equal(listing.status, 0)
  writeFileSync(resolve(output, 'resolved-files.log'), listing.stdout)
  for (const file of listing.stdout.split('\n')) {
    assert(
      !file.startsWith(resolve(core, 'src') + '/') &&
        !file.startsWith(resolve(core, 'dist') + '/'),
      'Relocated parity escaped into the original framework: ' + file,
    )
    assert(
      !file.startsWith(workspace + '/'),
      'Relocated parity escaped into the original fixture: ' + file,
    )
  }
} finally {
  assert.equal(
    packageHash(),
    originalPackageHash,
    'Canonical built package changed during copied parity verification',
  )
  writeFileSync(
    resolve(output, 'results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
  process.stdout.write(output + '\n')
}
