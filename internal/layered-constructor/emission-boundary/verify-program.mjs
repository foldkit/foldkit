import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = resolve(repository, 'packages/foldkit')
const output = mkdtempSync(resolve(directory, 'program-'))
const target = resolve(output, 'node_modules/foldkit')
const compiler = resolve(
  repository,
  'node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/bin/tsc',
)
const accepted = 'program-construction-portability.accepted.ts'
const consumer = 'program-construction-portability.consume.ts'
const results = []

const dependencies = root => {
  for (const [name, source] of [
    ['effect', 'node_modules/effect'],
    ['parse5', 'packages/foldkit/node_modules/parse5'],
    [
      '@effect/platform-browser',
      'packages/foldkit/node_modules/@effect/platform-browser',
    ],
  ]) {
    const path = resolve(root, 'node_modules', name)
    mkdirSync(dirname(path), { recursive: true })
    symlinkSync(realpathSync(resolve(repository, source)), path)
  }
}

mkdirSync(target, { recursive: true })
cpSync(resolve(core, 'dist'), resolve(target, 'dist'), { recursive: true })
cpSync(resolve(core, 'package.json'), resolve(target, 'package.json'))
dependencies(output)
writeFileSync(
  resolve(output, 'package.json'),
  '{"private":true,"type":"module"}\n',
)
mkdirSync(resolve(output, 'src'))
cpSync(
  resolve(core, 'declaration-tests', accepted),
  resolve(output, 'src', accepted),
)

const options = {
  strict: true,
  skipLibCheck: false,
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  target: 'ES2022',
  lib: ['ESNext', 'DOM'],
  types: [],
}
writeFileSync(
  resolve(output, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        ...options,
        declaration: true,
        emitDeclarationOnly: true,
        rootDir: 'src',
        outDir: 'declarations',
      },
      files: ['src/' + accepted],
    },
    null,
    2,
  ),
)

const run = (name, root = output, failure) => {
  const child = spawnSync(
    process.execPath,
    [compiler, '-p', 'tsconfig.json', '--listFiles', '--pretty', 'false'],
    { cwd: root, encoding: 'utf8' },
  )
  const text = (child.stdout ?? '') + (child.stderr ?? '')
  writeFileSync(resolve(output, name + '.log'), text)
  if (failure) {
    assert.notEqual(child.status, 0, name)
    assert.match(text, failure)
  } else {
    assert.equal(child.status, 0, `${name}\n${text}`)
  }
  results.push({ name, status: child.status })
  process.stdout.write(name + ': PASS\n')
  return text
}

run('source-and-emission')
const publicFile = resolve(target, 'dist/runtime/programPublic.d.ts')
const original = readFileSync(publicFile, 'utf8')
const exportedName = 'type ConstructionProgramFromRoot, '
assert(original.includes(exportedName))
writeFileSync(publicFile, original.replace(exportedName, ''))
try {
  run(
    'lost-public-program-return-name',
    output,
    /TS2883:[\s\S]*ConstructionProgramFromRoot/,
  )
} finally {
  writeFileSync(publicFile, original)
}
run('restored-emission')

const relocated = resolve(output, 'relocated')
mkdirSync(resolve(relocated, 'node_modules/foldkit'), { recursive: true })
cpSync(
  resolve(target, 'dist'),
  resolve(relocated, 'node_modules/foldkit/dist'),
  { recursive: true },
)
cpSync(
  resolve(target, 'package.json'),
  resolve(relocated, 'node_modules/foldkit/package.json'),
)
cpSync(resolve(output, 'declarations'), resolve(relocated, 'fixtures'), {
  recursive: true,
})
cpSync(
  resolve(core, 'declaration-tests', consumer),
  resolve(relocated, 'fixtures', consumer),
)
dependencies(relocated)
writeFileSync(
  resolve(relocated, 'package.json'),
  '{"private":true,"type":"module"}\n',
)
writeFileSync(
  resolve(relocated, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: { ...options, noEmit: true },
      files: ['fixtures/' + consumer],
    },
    null,
    2,
  ),
)
const external = run('strict-relocated', relocated)
assert(!external.includes(resolve(core, 'src')))
assert(!external.includes(resolve(core, 'dist')))
assert(!external.includes(resolve(output, 'src')))
assert(!external.includes(resolve(core, 'declaration-tests')))

writeFileSync(
  resolve(output, 'results.json'),
  JSON.stringify({ status: 'passed', compiler, results }, null, 2) + '\n',
)
process.stdout.write(output + '\n')
