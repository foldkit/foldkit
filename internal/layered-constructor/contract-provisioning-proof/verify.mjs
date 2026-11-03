import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
const chat = join(
  repository,
  'internal/layered-constructor/contract-provisioning',
)
const core = join(repository, 'packages/foldkit')
const compiler = join(core, 'node_modules/typescript/bin/tsc')
const vitest = join(core, 'node_modules/vitest/vitest.mjs')
const logs = join(fixture, 'verification')
const work = mkdtempSync(join(tmpdir(), 'foldkit-contract-provisioning-'))
const ts = createRequire(join(chat, 'package.json'))('@typescript/typescript6')
mkdirSync(logs, { recursive: true })

const results = []
const run = (name, script, args, cwd, accepted = true, expected) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(join(logs, `${name}.log`), output)
  assert.equal(result.error, undefined)
  if (accepted) {
    assert.equal(result.status, 0, `${name}\n${output}`)
  } else {
    assert.notEqual(result.status, 0, `${name} unexpectedly passed`)
  }
  if (expected !== undefined) {
    assert.match(output, expected)
  }
  results.push({
    name,
    expected: accepted ? 'accepted' : 'rejected',
    exitCode: result.status,
  })
  process.stdout.write(
    `${name}: ${accepted ? 'passed' : 'failed as expected'}\n`,
  )
}
const link = (root, name, target) => {
  const destination = join(root, 'node_modules', name)
  mkdirSync(dirname(destination), { recursive: true })
  if (!existsSync(destination)) {
    symlinkSync(target, destination, 'dir')
  }
}
const dependencies = root => {
  for (const name of ['effect', 'parse5', 'vitest', 'happy-dom']) {
    link(root, name, join(core, 'node_modules', name))
  }
  link(root, '@types', join(repository, 'node_modules/@types'))
  link(
    root,
    '@effect/platform-browser',
    join(core, 'node_modules/@effect/platform-browser'),
  )
}
const copyCore = root => {
  const destination = join(root, 'node_modules/foldkit')
  mkdirSync(destination, { recursive: true })
  cpSync(join(core, 'package.json'), join(destination, 'package.json'))
  cpSync(join(core, 'dist'), join(destination, 'dist'), { recursive: true })
  dependencies(root)
  return destination
}
const config = (root, include) => {
  cpSync(
    join(repository, 'tsconfig.base.json'),
    join(root, 'tsconfig.base.json'),
  )
  writeFileSync(
    join(root, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: './tsconfig.base.json',
        compilerOptions: {
          moduleResolution: 'Bundler',
          skipLibCheck: false,
          noEmit: true,
          types: ['node'],
        },
        include,
      },
      null,
      2,
    ),
  )
}

run(
  'proof-source',
  compiler,
  ['-p', 'tsconfig.json', '--noEmit', '--pretty', 'false'],
  fixture,
)
run('proof-runtime', vitest, ['run', '--config', 'vitest.config.ts'], fixture)
run(
  'chat-source',
  compiler,
  ['-p', 'tsconfig.json', '--noEmit', '--pretty', 'false'],
  chat,
)
run('chat-runtime', vitest, ['run', '--config', 'vitest.config.ts'], chat)
run('identical-expressions', join(chat, 'check-placements.mjs'), [], chat)
run('chat-behavior-control', join(chat, 'check-runtime-mutation.mjs'), [], chat)
run(
  'proof-declarations',
  compiler,
  ['-p', 'tsconfig.declarations.json', '--pretty', 'false'],
  fixture,
)

const chatDeclarationConfig = join(logs, 'chat-declarations.json')
writeFileSync(
  chatDeclarationConfig,
  JSON.stringify(
    {
      extends: join(chat, 'tsconfig.json'),
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        noEmit: false,
        skipLibCheck: false,
        rootDir: join(chat, 'src'),
        outDir: join(chat, 'declarations'),
      },
      include: [join(chat, 'src')],
    },
    null,
    2,
  ),
)
run(
  'chat-declarations',
  compiler,
  ['-p', chatDeclarationConfig, '--pretty', 'false'],
  chat,
)

const headers = [
  [join(fixture, 'declarations/basic.d.ts'), 'Contract'],
  [join(fixture, 'declarations/basic.d.ts'), 'ParentBlock'],
  [
    join(chat, 'declarations/messageComposer/definition.d.ts'),
    'MessageComposerContract',
  ],
  [join(chat, 'declarations/chatRoom/definition.d.ts'), 'ChatRoomContract'],
  [join(chat, 'declarations/chatRoom/block.d.ts'), 'ChatRoomBlock'],
].map(([path, name]) => {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  const declarations = source.statements.flatMap(statement =>
    ts.isVariableStatement(statement)
      ? Array.from(statement.declarationList.declarations)
      : [],
  )
  const declaration = declarations.find(
    item => item.name.getText(source) === name,
  )
  assert(declaration?.type !== undefined, `${name}: emitted header missing`)
  const header = declaration.type.getText(source)
  assert.doesNotMatch(
    header,
    /StaticSource|AuthoringComposition|Plan<|prepareBlock|ProjectFacts|typeof prepare/,
  )
  return { name, bytes: Buffer.byteLength(header) }
})

const relocated = join(work, 'relocated')
mkdirSync(relocated)
copyCore(relocated)
cpSync(join(fixture, 'declarations'), join(relocated, 'declarations'), {
  recursive: true,
})
cpSync(join(chat, 'declarations'), join(relocated, 'chat'), { recursive: true })
cpSync(join(fixture, 'external'), join(relocated, 'external'), {
  recursive: true,
})
config(relocated, ['external'])
run(
  'relocated-external',
  compiler,
  ['-p', 'tsconfig.json', '--pretty', 'false'],
  relocated,
)

const mutateDeclarations = (
  name,
  transform,
  expected,
  declarationFile = 'contract.d.ts',
) => {
  const root = join(work, name)
  mkdirSync(root)
  const copied = copyCore(root)
  cpSync(join(fixture, 'src'), join(root, 'src'), { recursive: true })
  config(root, ['src'])
  const path = join(copied, 'dist/experimental/contracted', declarationFile)
  const original = readFileSync(path, 'utf8')
  const next = transform(original)
  assert.notEqual(next, original, `${name}: missing mutation target`)
  writeFileSync(path, next)
  run(
    name,
    compiler,
    ['-p', 'tsconfig.json', '--pretty', 'false'],
    root,
    false,
    expected,
  )
}

mutateDeclarations(
  'contract-validation-control',
  original => {
    const start = original.indexOf('type ContractValidation<')
    const end = original.indexOf('type KeysOfUnion<', start)
    assert(start !== -1 && end > start)
    return `${original.slice(0, start)}type ContractValidation<Actual extends PublicFacts, Declared extends PublicFacts> = readonly [];\n${original.slice(end)}`
  },
  /TS2578: Unused '@ts-expect-error'/,
)

mutateDeclarations(
  'result-service-control',
  original => {
    const start = original.indexOf('type InvalidResultChannel<')
    const end = original.indexOf('type ContractValidation<', start)
    assert(start !== -1 && end > start)
    return `${original.slice(0, start)}type InvalidResultChannel<Actual extends PublicFacts, Declared extends PublicFacts> = never;\n${original.slice(end)}`
  },
  /src\/rejected\.ts\(.*TS2578: Unused '@ts-expect-error'/,
)

mutateDeclarations(
  'constructor-operations-control',
  original =>
    original.replace(
      /type ValidateConstructorBody<Body> =[^;]+;/,
      'type ValidateConstructorBody<Body> = unknown;',
    ),
  /src\/checks\.ts\(.*TS2578: Unused '@ts-expect-error'/,
)

mutateDeclarations(
  'contract-facts-control',
  original =>
    original.replace(
      /readonly \[ContractGraphTypeId\]: \(facts: Facts\) => Facts;/,
      '',
    ),
  /src\/checks\.ts\(.*TS2578: Unused '@ts-expect-error'/,
)

mutateDeclarations(
  'contract-owner-control',
  original => {
    const start = original.indexOf('export type NominalId<')
    const end = original.indexOf('type AnySchema', start)
    assert(start !== -1 && end > start)

    return `${original.slice(0, start)}export type NominalId<Id extends string, Key extends symbol> = Id;\n${original.slice(end)}`
  },
  /src\/identity\.ts\(.*TS2578: Unused '@ts-expect-error'/,
)

mutateDeclarations(
  'contract-literal-id-control',
  original => original.replace('id: Id & LiteralContractId<Id>', 'id: Id'),
  /src\/checks\.ts\(.*TS2578: Unused '@ts-expect-error'/,
  'runtime.d.ts',
)

mutateDeclarations(
  'input-contract-inference-control',
  original =>
    original.replace(
      'Declaration extends InputContract<infer Value> ? Value : never',
      'Declaration extends InputContract<infer Value> ? unknown : never',
    ),
  /src\/input-contracts\.ts\(.*(?:TS18046|TS2344|TS2339)/,
  'inputContract.d.ts',
)

const operationRoot = join(work, 'mapped-operation-control')
mkdirSync(operationRoot)
const operationCore = copyCore(operationRoot)
cpSync(join(fixture, 'src'), join(operationRoot, 'src'), { recursive: true })
config(operationRoot, ['src'])
const operationPath = join(
  operationCore,
  'dist/experimental/constructed/contract.d.ts',
)
const operationDeclaration = readFileSync(operationPath, 'utf8')
const operationStart = operationDeclaration.indexOf('type OperationFunction<')
const operationEnd = operationDeclaration.indexOf(
  'type ExecutableOperations<',
  operationStart,
)
assert(operationStart !== -1 && operationEnd > operationStart)
const operationSection = operationDeclaration.slice(
  operationStart,
  operationEnd,
)
const widenedOperation = operationSection.replace(
  '...args: Args',
  '...args: ReadonlyArray<any>',
)
assert.notEqual(widenedOperation, operationSection)
writeFileSync(
  operationPath,
  `${operationDeclaration.slice(0, operationStart)}${widenedOperation}${operationDeclaration.slice(operationEnd)}`,
)
run(
  'mapped-operation-control',
  compiler,
  ['-p', 'tsconfig.json', '--pretty', 'false'],
  operationRoot,
  false,
  /src\/input-contracts\.ts\(.*TS2578: Unused '@ts-expect-error'/,
)

const collisionRoot = join(work, 'collision-control')
mkdirSync(collisionRoot)
const collisionCore = copyCore(collisionRoot)
cpSync(join(fixture, 'src'), join(collisionRoot, 'src'), { recursive: true })
cpSync(join(fixture, 'test'), join(collisionRoot, 'test'), { recursive: true })
cpSync(
  join(fixture, 'vitest.config.ts'),
  join(collisionRoot, 'vitest.config.ts'),
)
writeFileSync(
  join(collisionRoot, 'package.json'),
  '{"private":true,"type":"module"}\n',
)
const runtimePath = join(
  collisionCore,
  'dist/experimental/contracted/runtime.js',
)
const runtime = readFileSync(runtimePath, 'utf8')
const duplicateKeyGuard =
  'if (isOrdinaryDeclaration && declaredKeys.has(config.key))'
assert(runtime.includes(duplicateKeyGuard))
writeFileSync(runtimePath, runtime.replace(duplicateKeyGuard, 'if (false)'))
run(
  'contract-key-control',
  vitest,
  ['run', '--config', 'vitest.config.ts', 'test/runtime.test.ts'],
  collisionRoot,
  false,
  /expected.*to throw|toThrow/,
)

writeFileSync(
  join(fixture, 'results.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      workspace: repository,
      temporaryWork: work,
      noSourceFallback: true,
      skipLibCheck: false,
      compactHeaders: headers,
      checks: results,
      limitations: [
        'Generic provider factories and arbitrary handler Service/error bounds need production authoring design before repository adoption.',
      ],
    },
    null,
    2,
  ),
)
