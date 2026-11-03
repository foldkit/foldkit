import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const compiler =
  process.env['FOLDKIT_OCCURRENCE_COMPILER'] ??
  join(packageRoot, 'node_modules/typescript/bin/tsc')
const fixture = mkdtempSync(join(tmpdir(), 'foldkit-occurrence-consumer-'))
try {
  const files = [
    'counter.ts',
    'definition.ts',
    'composition.ts',
    'transitions.ts',
    'block.ts',
    'pairedFields.ts',
    'familyFields.ts',
    'contracts.ts',
  ]
  const replacements = [
    ["'../../../index.js'", "'foldkit'"],
    ["'../../../message/index.js'", "'foldkit/message'"],
    ["'../../../update/index.js'", "'foldkit/update'"],
    ["'../../../block/public.js'", "'foldkit/block'"],
  ]

  for (const file of files) {
    let source = readFileSync(
      join(packageRoot, 'src/test/apps/childInstances', file),
      'utf8',
    )

    for (const [from, to] of replacements) {
      if (from === undefined || to === undefined) {
        throw new Error('An import replacement is incomplete.')
      }

      source = source.replaceAll(from, to)
    }

    writeFileSync(join(fixture, file), source)
  }

  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify({ type: 'module', private: true }),
  )
  mkdirSync(join(fixture, 'node_modules'))
  const consumerPackage = join(fixture, 'node_modules/foldkit')
  mkdirSync(consumerPackage)
  cpSync(
    join(packageRoot, 'package.json'),
    join(consumerPackage, 'package.json'),
  )
  cpSync(join(packageRoot, 'dist'), join(consumerPackage, 'dist'), {
    recursive: true,
  })

  for (const dependency of ['effect', '@effect/platform-browser', 'parse5']) {
    const destination = join(fixture, 'node_modules', dependency)
    mkdirSync(dirname(destination), { recursive: true })
    symlinkSync(join(packageRoot, 'node_modules', dependency), destination)
  }

  const options = {
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: false,
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    target: 'ES2022',
    lib: ['ESNext', 'DOM', 'DOM.Iterable'],
    types: [],
    noEmit: true,
  }
  const checks: Array<string> = []
  const run = (name: string, config: object, expectedSuccess = true): void => {
    const configPath = join(fixture, `tsconfig.${name}.json`)
    writeFileSync(configPath, JSON.stringify(config, null, 2))

    const result = spawnSync(
      process.execPath,
      [compiler, '-p', configPath, '--pretty', 'false'],
      { encoding: 'utf8' },
    )
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    writeFileSync(join(fixture, `${name}.log`), output)

    if (
      result.error !== undefined ||
      (result.status === 0) !== expectedSuccess
    ) {
      throw new Error(
        `${name} failed its expected compiler result: ${output}`,
        {
          cause: result.error,
        },
      )
    }

    if (
      !expectedSuccess &&
      !output.includes('is not assignable') &&
      !output.includes('does not exist')
    ) {
      throw new Error(
        `${name} failed without the expected type rejection: ${output}`,
      )
    }

    checks.push(name)
  }

  run('source', {
    compilerOptions: {
      ...options,
      paths: {
        foldkit: [join(packageRoot, 'src/index.ts')],
        'foldkit/*': [join(packageRoot, 'src/*/public.ts')],
      },
    },
    files: [...files, join(packageRoot, 'src/vite-env.d.ts')],
  })
  run('emitted', { compilerOptions: options, files })
  run('emit-consumer', {
    compilerOptions: {
      ...options,
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: './emitted',
    },
    files,
  })

  const relocated = join(fixture, 'relocated')
  mkdirSync(relocated)
  cpSync(join(fixture, 'emitted'), join(relocated, 'app'), { recursive: true })
  writeFileSync(
    join(relocated, 'consumer.ts'),
    readFileSync(
      join(packageRoot, 'declaration-tests/child-instances/consumer.ts'),
      'utf8',
    ).replaceAll("'../../src/test/apps/childInstances/", "'./app/"),
  )
  run('relocated', {
    compilerOptions: options,
    files: ['relocated/consumer.ts'],
  })

  writeFileSync(
    join(fixture, 'invalid.ts'),
    readFileSync(join(fixture, 'contracts.ts'), 'utf8').replaceAll(
      /^\s*\/\/ @ts-expect-error.*\n/gm,
      '\n',
    ),
  )
  run(
    'negative-control',
    { compilerOptions: options, files: ['invalid.ts'] },
    false,
  )
  process.stdout.write(`${JSON.stringify({ checks }, null, 2)}\n`)
} catch (error) {
  process.stderr.write(
    `Child Instance consumer artifacts retained at ${fixture}\n`,
  )
  throw error
}

rmSync(fixture, { recursive: true, force: true })
