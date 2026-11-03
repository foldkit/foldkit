import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const spike = join(root, 'internal/update-composition')
const compiler = join(root, 'packages/foldkit/node_modules/typescript/bin/tsc')
const vitest = join(root, 'packages/foldkit/node_modules/vitest/vitest.mjs')
const receipts = mkdtempSync(
  join(tmpdir(), 'foldkit-update-composition-verify-'),
)
const results: Array<Readonly<{ name: string; status: number | null }>> = []

const run = (name: string, args: ReadonlyArray<string>, cwd = root): void => {
  process.stdout.write(`${name}\n`)

  const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' })
  results.push({ name, status: result.status })
  writeFileSync(
    join(receipts, 'results.json'),
    JSON.stringify(results, null, 2),
  )

  if (result.status !== 0) {
    process.stderr.write(`Verification stopped. Receipts: ${receipts}\n`)
    process.exit(result.status ?? 1)
  }
}

const vitestLink = join(spike, 'node_modules/vitest')

if (!existsSync(vitestLink)) {
  mkdirSync(join(spike, 'node_modules'), { recursive: true })
  symlinkSync(
    realpathSync(join(root, 'packages/foldkit/node_modules/vitest')),
    vitestLink,
  )
}

run('Type algebra and rejected combinations', [
  compiler,
  '-p',
  join(spike, 'types/tsconfig.json'),
  '--pretty',
  'false',
])
run('Integrated split-file consumer', [
  compiler,
  '-p',
  join(
    root,
    'packages/foldkit/declaration-tests/tsconfig.update-composition.source.json',
  ),
  '--pretty',
  'false',
])
run(
  'Native stage execution and delivery controls',
  [
    vitest,
    'run',
    'src/block/updateComposition.runtime.test.ts',
    'src/block/delivery.test.ts',
    'src/block/dual-update.runtime.test.ts',
    'src/block/compositionSafety.test.ts',
    '--config',
    'vitest.config.ts',
  ],
  join(root, 'packages/foldkit'),
)
run('Constructed consumer Story and acquired calls', [
  vitest,
  'run',
  '--config',
  join(spike, 'vitest.config.ts'),
])

const declarations = join(receipts, 'declarations')

run('Emit integrated declarations', [
  compiler,
  '-p',
  join(spike, 'tsconfig.declarations.json'),
  '--outDir',
  declarations,
  '--pretty',
  'false',
])

const assertNoAbsoluteImports = (directory: string): void => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      assertNoAbsoluteImports(path)
    } else if (entry.name.endsWith('.d.ts')) {
      const contents = readFileSync(path, 'utf8')

      if (contents.includes('/private/tmp/') || contents.includes('/Users/')) {
        throw new Error(`Declaration retains an absolute path: ${path}`)
      }
    }
  }
}

assertNoAbsoluteImports(declarations)

const relocated = join(receipts, 'relocated')
const dependencies = join(relocated, 'node_modules')
mkdirSync(dependencies, { recursive: true })
cpSync(declarations, join(relocated, 'published'), { recursive: true })
const publishedFramework = join(relocated, 'published/packages/foldkit')
const frameworkManifest = JSON.parse(
  readFileSync(join(root, 'packages/foldkit/package.json'), 'utf8'),
)
writeFileSync(
  join(publishedFramework, 'package.json'),
  JSON.stringify(frameworkManifest).replaceAll('./dist/', './src/'),
)
symlinkSync(publishedFramework, join(dependencies, 'foldkit'))
cpSync(join(spike, 'relocated-consumer.ts'), join(relocated, 'consumer.ts'))
symlinkSync(
  realpathSync(join(root, 'node_modules/effect')),
  join(dependencies, 'effect'),
)
mkdirSync(join(dependencies, '@types'), { recursive: true })
symlinkSync(
  realpathSync(join(root, 'node_modules/@types/node')),
  join(dependencies, '@types/node'),
)
writeFileSync(
  join(relocated, 'package.json'),
  JSON.stringify({ type: 'module' }),
)
writeFileSync(
  join(relocated, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        noUncheckedIndexedAccess: true,
        exactOptionalPropertyTypes: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        types: ['node'],
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      },
      include: ['consumer.ts'],
    },
    null,
    2,
  ),
)
run('Relocated strict declarations without application source', [
  compiler,
  '-p',
  join(relocated, 'tsconfig.json'),
  '--pretty',
  'false',
])

process.stdout.write(`Verification passed. Receipts: ${receipts}\n`)
