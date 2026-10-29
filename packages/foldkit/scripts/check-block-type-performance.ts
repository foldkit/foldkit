import { Array, Option, Schema } from 'effect'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Diagnostics = Readonly<{
  instantiations: number
  types: number
  symbols: number
}>

const DiagnosticMaximum = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: globalThis.Number.MAX_SAFE_INTEGER }),
)
type DiagnosticMaximum = typeof DiagnosticMaximum.Type
const TypePerformanceBudget = Schema.Struct({
  maxInstantiationsDelta: DiagnosticMaximum,
  maxTypesDelta: DiagnosticMaximum,
})
type TypePerformanceBudget = typeof TypePerformanceBudget.Type
const BudgetsFile = Schema.Struct({
  typescriptVersion: Schema.String.check(
    Schema.isPattern(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/),
  ),
  fixtures: Schema.Record(Schema.String, TypePerformanceBudget),
})
type BudgetsFile = typeof BudgetsFile.Type
const FixtureManifest = Schema.Struct({
  fixtures: Schema.Array(
    Schema.Struct({ name: Schema.String, file: Schema.String }),
  ),
})
type FixtureManifest = typeof FixtureManifest.Type

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const typePerformanceRoot = join(packageRoot, 'type-performance')
const baselinePath = join(typePerformanceRoot, 'baseline.ts')
const defaultBudgetsPath = join(typePerformanceRoot, 'budgets.json')
const fixtureManifestPath = join(typePerformanceRoot, 'fixtures.json')
const compiler = join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
)

const fail = (message: string): never => {
  throw new Error(message)
}

const getAt = <Value>(
  values: ReadonlyArray<Value>,
  index: number,
): Value | undefined => Option.getOrUndefined(Array.get(values, index))

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return fail(
      `Could not parse ${path}: ${
        error instanceof Error ? error.message : globalThis.String(error)
      }`,
    )
  }
}

const readBudgets = (path: string): BudgetsFile => {
  try {
    return Schema.decodeUnknownSync(BudgetsFile)(readJson(path))
  } catch (error) {
    return fail(
      `Invalid type-performance budgets in ${path}: ${
        error instanceof Error ? error.message : globalThis.String(error)
      }`,
    )
  }
}

const readFixtureManifest = (): FixtureManifest => {
  try {
    return Schema.decodeUnknownSync(FixtureManifest)(
      readJson(fixtureManifestPath),
    )
  } catch (error) {
    return fail(
      `Invalid type-performance fixture manifest: ${
        error instanceof Error ? error.message : globalThis.String(error)
      }`,
    )
  }
}

const readMetric = (output: string, label: string, metric: string): number => {
  const match = output.match(new RegExp(`^${metric}:\\s+(\\d+)$`, 'm'))

  if (match === null) {
    return fail(`Could not read ${metric} from compiler output for ${label}.`)
  }

  const [, value] = match

  return globalThis.Number(
    value ?? fail(`Missing ${metric} value for ${label}.`),
  )
}

const readDiagnostics = (output: string, label: string): Diagnostics => ({
  instantiations: readMetric(output, label, 'Instantiations'),
  types: readMetric(output, label, 'Types'),
  symbols: readMetric(output, label, 'Symbols'),
})

const runCompiler = (
  args: ReadonlyArray<string>,
): Readonly<{ output: string; status: number }> => {
  const result = spawnSync(compiler, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    env: process.env,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`

  if (result.error !== undefined) {
    throw result.error
  }

  return { output, status: result.status ?? 1 }
}

const measure = (
  runRoot: string,
  label: string,
  sourcePath: string,
): Diagnostics => {
  process.stderr.write(`[block-type-performance] Measuring ${label}...\n`)
  const configPath = join(runRoot, `${label}.json`)
  writeFileSync(
    configPath,
    `${JSON.stringify(
      {
        extends: join(typePerformanceRoot, 'tsconfig.json'),
        files: [sourcePath],
        include: [],
        compilerOptions: {
          incremental: false,
          composite: false,
          noEmit: true,
        },
      },
      null,
      2,
    )}\n`,
  )

  const result = runCompiler([
    '-p',
    configPath,
    '--extendedDiagnostics',
    '--noEmit',
    '--pretty',
    'false',
  ])

  if (result.status !== 0) {
    process.stderr.write(result.output)
    return fail(`Compiler failed for ${label}.`)
  }

  return readDiagnostics(result.output, label)
}

const subtractDiagnostics = (
  total: Diagnostics,
  baseline: Diagnostics,
): Diagnostics => ({
  instantiations: total.instantiations - baseline.instantiations,
  types: total.types - baseline.types,
  symbols: total.symbols - baseline.symbols,
})

export const exceededBudgetMetrics = (
  diagnostics: Diagnostics,
  budget: TypePerformanceBudget,
): globalThis.Array<'Instantiations' | 'Types'> => {
  const exceeded: globalThis.Array<'Instantiations' | 'Types'> = []

  if (diagnostics.instantiations > budget.maxInstantiationsDelta) {
    exceeded.push('Instantiations')
  }

  if (diagnostics.types > budget.maxTypesDelta) {
    exceeded.push('Types')
  }

  return exceeded
}

const formatNumber = (value: number): string => value.toLocaleString('en-US')

const printRows = (
  rows: ReadonlyArray<
    Readonly<{
      name: string
      diagnostics: Diagnostics
      budget: TypePerformanceBudget
      status: string
    }>
  >,
): void => {
  const heading = [
    'fixture',
    'instDelta',
    'instMax',
    'typesDelta',
    'typesMax',
    'symbolsDelta',
    'status',
  ]
  const table = [
    heading,
    ...rows.map(row => [
      row.name,
      formatNumber(row.diagnostics.instantiations),
      formatNumber(row.budget.maxInstantiationsDelta),
      formatNumber(row.diagnostics.types),
      formatNumber(row.budget.maxTypesDelta),
      formatNumber(row.diagnostics.symbols),
      row.status,
    ]),
  ]
  const widths = heading.map((_cell, index) =>
    Math.max(...table.map(row => getAt(row, index)?.length ?? 0)),
  )

  for (const [index, row] of table.entries()) {
    process.stdout.write(
      `${row
        .map((cell, cellIndex) => cell.padEnd(getAt(widths, cellIndex) ?? 0))
        .join('  ')}\n`,
    )

    if (index === 0) {
      process.stdout.write(
        `${widths.map(width => '-'.repeat(width)).join('  ')}\n`,
      )
    }
  }
}

const assertBuiltDeclarations = (): void => {
  for (const path of [
    'dist/runtime/programPublic.d.ts',
    'dist/block/public.d.ts',
    'dist/command/public.d.ts',
    'dist/update/public.d.ts',
  ]) {
    if (!existsSync(join(packageRoot, path))) {
      fail(
        `Missing ${path}. Build the foldkit package before checking Block type performance.`,
      )
    }
  }
}

const main = (): void => {
  const args = process.argv.slice(2)
  const targets: globalThis.Array<string> = []
  const argumentIterator = args.values()
  let isUpdate = false
  let budgetsPathArgument: string | undefined

  for (const argument of argumentIterator) {
    if (argument === '--update') {
      if (isUpdate) {
        fail('--update may be passed only once.')
      }

      isUpdate = true
    } else if (argument === '--budgets') {
      if (budgetsPathArgument !== undefined) {
        fail('--budgets may be passed only once.')
      }

      const nextArgument = argumentIterator.next()
      if (nextArgument.done || nextArgument.value.startsWith('--')) {
        fail('--budgets requires a path.')
      }

      budgetsPathArgument = nextArgument.value
    } else if (argument.startsWith('--')) {
      fail(`Unknown option ${argument}.`)
    } else {
      targets.push(argument)
    }
  }

  if (targets.length > 1) {
    fail(`Expected at most one fixture name, received ${targets.join(', ')}.`)
  }

  const budgetsPath =
    budgetsPathArgument === undefined
      ? defaultBudgetsPath
      : resolve(budgetsPathArgument)
  const budgets = readBudgets(budgetsPath)

  assertBuiltDeclarations()

  const versionResult = runCompiler(['--version'])
  if (versionResult.status !== 0) {
    return fail(`Could not read TypeScript version:\n${versionResult.output}`)
  }

  const versionMatch = versionResult.output
    .trim()
    .match(/^Version (\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/)
  if (versionMatch === null) {
    return fail(
      `Unexpected TypeScript version output: ${versionResult.output.trim()}`,
    )
  }

  const [, maybeTypescriptVersion] = versionMatch
  const typescriptVersion =
    maybeTypescriptVersion ?? fail('Missing TypeScript version.')
  const target = Option.getOrUndefined(Array.head(targets))
  if (
    budgets.typescriptVersion !== typescriptVersion &&
    (!isUpdate || target !== undefined)
  ) {
    fail(
      `Budgets require TypeScript ${budgets.typescriptVersion}, but the package compiler is ${typescriptVersion}. Refresh every budget together with --update before running a targeted update.`,
    )
  }

  const { fixtures } = readFixtureManifest()
  const selectedFixtures = fixtures.filter(
    fixture => target === undefined || fixture.name === target,
  )
  if (Array.isArrayEmpty(selectedFixtures)) {
    fail(
      `Unknown fixture ${JSON.stringify(target)}. Available fixtures: ${fixtures
        .map(fixture => fixture.name)
        .join(', ')}.`,
    )
  }

  const runRoot = mkdtempSync(join(tmpdir(), 'foldkit-block-type-performance-'))

  try {
    const baseline = measure(runRoot, 'baseline', baselinePath)
    const nextFixtures: Record<string, TypePerformanceBudget> =
      isUpdate && target === undefined ? {} : { ...budgets.fixtures }
    const rows: globalThis.Array<{
      name: string
      diagnostics: Diagnostics
      budget: TypePerformanceBudget
      status: string
    }> = []
    let hasFailure = false

    for (const fixture of selectedFixtures) {
      const sourcePath = join(typePerformanceRoot, fixture.file)
      const total = measure(runRoot, fixture.name, sourcePath)
      const diagnostics = subtractDiagnostics(total, baseline)
      const existingBudget = budgets.fixtures[fixture.name]

      if (isUpdate) {
        const budget = {
          maxInstantiationsDelta: diagnostics.instantiations,
          maxTypesDelta: diagnostics.types,
        }
        nextFixtures[fixture.name] = budget
        rows.push({
          name: fixture.name,
          diagnostics,
          budget,
          status: 'updated',
        })
        continue
      }

      if (existingBudget === undefined) {
        hasFailure = true
        rows.push({
          name: fixture.name,
          diagnostics,
          budget: { maxInstantiationsDelta: 0, maxTypesDelta: 0 },
          status: 'missing budget',
        })
        continue
      }

      const exceeded = exceededBudgetMetrics(diagnostics, existingBudget)
      if (Array.isArrayNonEmpty(exceeded)) {
        hasFailure = true
      }
      rows.push({
        name: fixture.name,
        diagnostics,
        budget: existingBudget,
        status: Array.isArrayEmpty(exceeded)
          ? 'ok'
          : `failed: ${exceeded.join(', ')}`,
      })
    }

    if (isUpdate) {
      writeFileSync(
        budgetsPath,
        `${JSON.stringify(
          { typescriptVersion, fixtures: nextFixtures },
          null,
          2,
        )}\n`,
      )
    }

    printRows(rows)

    if (hasFailure) {
      process.exitCode = 1
    }
  } finally {
    rmSync(runRoot, { recursive: true, force: true })
  }
}

const maybeScriptPath = Array.head(process.argv.slice(1))
const isMain = Option.match(maybeScriptPath, {
  onNone: () => false,
  onSome: scriptPath => fileURLToPath(import.meta.url) === resolve(scriptPath),
})

if (isMain) {
  try {
    main()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : globalThis.String(error)
    console.error(`[block-type-performance] ${message}`)
    process.exitCode = 1
  }
}
