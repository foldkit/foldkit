import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../../..')
const compiler = path.join(
  root,
  'packages/foldkit/node_modules/typescript/bin/tsc',
)
const verification = path.join(directory, 'verification')
mkdirSync(verification, { recursive: true })
const receipt = { node: process.version, stages: [], mutations: [] }

const run = (label, config, extra = []) => {
  const result = spawnSync(
    process.execPath,
    [compiler, '-p', config, '--pretty', 'false', ...extra],
    {
      cwd: root,
      encoding: 'utf8',
    },
  )
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(path.join(verification, `${label}.log`), output)
  receipt.stages.push({
    label,
    status: result.status,
    command: [
      'node',
      path.relative(root, compiler),
      '-p',
      path.relative(root, config),
      '--pretty',
      'false',
      ...extra,
    ],
  })
  return { status: result.status, output }
}

for (const [label, name] of [
  ['source', 'tsconfig.json'],
  ['emit', 'tsconfig.declarations.json'],
]) {
  if (label === 'emit') {
    rmSync(path.join(verification, 'emitted'), { recursive: true, force: true })
  }
  const result = run(label, path.join(directory, name))
  if (result.status !== 0) {
    process.stderr.write(result.output)
    process.exit(1)
  }
}

const relocated = path.join(verification, 'relocated')
rmSync(relocated, { recursive: true, force: true })
mkdirSync(relocated, { recursive: true })
cpSync(path.join(verification, 'emitted'), path.join(relocated, 'emitted'), {
  recursive: true,
})
const consume = readFileSync(path.join(directory, 'consume.ts'), 'utf8')
  .replaceAll("from './", "from './emitted/internal/update-composition/types/")
  .replaceAll("from '../../../packages/", "from './emitted/packages/")
writeFileSync(path.join(relocated, 'consume.ts'), consume)
const config = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    skipLibCheck: false,
    noEmit: true,
    types: [],
    paths: {
      foldkit: ['./emitted/packages/foldkit/src/index.d.ts'],
      'foldkit/*': ['./emitted/packages/foldkit/src/*/public.d.ts'],
    },
  },
  files: ['./consume.ts'],
}
const relocatedConfig = path.join(relocated, 'tsconfig.json')
writeFileSync(relocatedConfig, JSON.stringify(config, null, 2))
let result = run('relocated', relocatedConfig, ['--listFiles'])
if (result.status !== 0) {
  process.stderr.write(result.output)
  process.exit(1)
}
const forbiddenSources = result.output
  .split('\n')
  .filter(
    line =>
      line.startsWith(root) &&
      !line.startsWith(verification) &&
      /(?<!\.d)\.tsx?$/.test(line),
  )
if (forbiddenSources.length !== 0) {
  throw new Error(
    `Relocation read original source: ${forbiddenSources.join(', ')}`,
  )
}
receipt.sourceFree = true

const declaration = path.join(
  relocated,
  'emitted/packages/foldkit/src/experimental/hybrid/updateComposition.d.ts',
)
const original = readFileSync(declaration, 'utf8')
for (const [label, before, after, diagnostic] of [
  [
    'lost-requirements',
    'Extract<Rows, readonly [Tag, unknown, unknown, unknown]>[2]',
    'never',
    'TS2344',
  ],
  [
    'lost-emitter-conflict',
    'CompetingEmitters<Source, Parts>',
    'never',
    'TS2578',
  ],
]) {
  if (!original.includes(before)) {
    throw new Error(`Mutation anchor missing: ${label}`)
  }
  writeFileSync(declaration, original.replace(before, after))
  result = run(`mutation-${label}`, relocatedConfig)
  writeFileSync(declaration, original)
  if (result.status === 0 || !result.output.includes(diagnostic)) {
    throw new Error(
      `Mutation did not fail meaningfully: ${label}\n${result.output}`,
    )
  }
  receipt.mutations.push({
    label,
    expectedDiagnostic: diagnostic,
    status: result.status,
  })
}
result = run('restored-relocated', relocatedConfig)
if (result.status !== 0) {
  throw new Error(result.output)
}
receipt.authoringSha256 = createHash('sha256')
  .update(
    readFileSync(
      path.join(
        root,
        'packages/foldkit/src/experimental/hybrid/updateComposition.ts',
      ),
    ),
  )
  .digest('hex')
writeFileSync(
  path.join(verification, 'results.json'),
  `${JSON.stringify(receipt, null, 2)}\n`,
)
process.stdout.write(
  `Source, declaration, source-free consumer and ${receipt.mutations.length} declaration mutations passed.\n`,
)
