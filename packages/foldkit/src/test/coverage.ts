import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The default route-declaration scanner. Captures the tag `T` from every
 *  `r('T')` / `r("T")` route builder call. Group 1 must be the tag. */
const DEFAULT_ROUTE_PATTERN = /\br\(\s*['"`](\w+)['"`]/g

/** The default coverage marker. A route `T` is covered when some test file
 *  contains `describe('route:T', ...)`. Group 1 must be the tag. */
const DEFAULT_MARKER_PATTERN = /describe\(\s*['"`]route:(\w+)['"`]/g

const DEFAULT_TEST_FILE_SUFFIX = '.test.ts'

export type Options = Readonly<{
  /** Path (or `file:` URL) to the module that declares the route registry,
   *  typically `route.ts`. Scanned as text; never imported. */
  routeSource: string | URL
  /** Directory whose test files are scanned for coverage markers. */
  testDir: string | URL
  /** Route tags allowed to lack a spec, tracked as debt. Only ever shrinks. */
  knownDebt?: Iterable<string>
  /** Route tags excluded from the registry (fallbacks). Default `['NotFound']`. */
  ignore?: Iterable<string>
  /** Overrides {@link DEFAULT_ROUTE_PATTERN}. Group 1 must capture the tag. */
  routePattern?: RegExp
  /** Overrides {@link DEFAULT_MARKER_PATTERN}. Group 1 must capture the tag. */
  markerPattern?: RegExp
  /** Test-file suffix scanned for markers. Default `'.test.ts'`. */
  testFileSuffix?: string
}>

/** The outcome of a coverage audit. Both `errors` and `staleDebt` must be
 *  empty for the ratchet to hold; `debt` is tracked, non-blocking. */
export type Report = Readonly<{
  /** Every route tag declared in `routeSource`, minus `ignore`. */
  registry: ReadonlyArray<string>
  /** Registry tags carrying a coverage marker. */
  covered: ReadonlyArray<string>
  /** Registry tags with no coverage marker. */
  uncovered: ReadonlyArray<string>
  /** Uncovered tags NOT in `knownDebt`: new or regressed routes. Must be empty. */
  errors: ReadonlyArray<string>
  /** `knownDebt` tags that are no longer uncovered: stale, remove them. Must be empty. */
  staleDebt: ReadonlyArray<string>
  /** Uncovered tags that ARE in `knownDebt`: tracked debt, non-blocking. */
  debt: ReadonlyArray<string>
}>

/** All capture-group-1 matches of `pattern` over `source`, in order, unique,
 *  dropping empty slots. */
const captures = (source: string, pattern: RegExp): ReadonlyArray<string> => {
  const seen = new Set<string>()
  for (const [, tag] of source.matchAll(pattern)) {
    if (tag !== undefined) {
      seen.add(tag)
    }
  }
  return [...seen]
}

const toPath = (source: string | URL): string =>
  typeof source === 'string' ? source : fileURLToPath(source)

/** Every route tag marked as covered by some test file under `testDir`. */
const coveredTags = (
  testDir: string,
  suffix: string,
  markerPattern: RegExp,
): ReadonlySet<string> => {
  const covered = new Set<string>()
  for (const entry of readdirSync(testDir, { recursive: true })) {
    const relative = String(entry)
    if (!relative.endsWith(suffix)) {
      continue
    }
    const text = readFileSync(join(testDir, relative), 'utf8')
    for (const tag of captures(text, markerPattern)) {
      covered.add(tag)
    }
  }
  return covered
}

/** Scan the route registry and test markers on disk and compute the coverage
 *  report. Reads files only; imports no application code. */
export const audit = (options: Options): Report => {
  const ignore = new Set(options.ignore ?? ['NotFound'])
  const knownDebt = new Set(options.knownDebt ?? [])
  const routePattern = options.routePattern ?? DEFAULT_ROUTE_PATTERN
  const markerPattern = options.markerPattern ?? DEFAULT_MARKER_PATTERN
  const suffix = options.testFileSuffix ?? DEFAULT_TEST_FILE_SUFFIX

  const routeText = readFileSync(toPath(options.routeSource), 'utf8')
  const registry = captures(routeText, routePattern).filter(
    tag => !ignore.has(tag),
  )

  const marked = coveredTags(toPath(options.testDir), suffix, markerPattern)
  const covered = registry.filter(tag => marked.has(tag))
  const uncovered = registry.filter(tag => !marked.has(tag))
  const errors = uncovered.filter(tag => !knownDebt.has(tag))
  const debt = uncovered.filter(tag => knownDebt.has(tag))
  const staleDebt = [...knownDebt].filter(tag => !uncovered.includes(tag))

  return { registry, covered, uncovered, errors, staleDebt, debt }
}

/** Assert that every declared route has at least one behavioral Scene, allowing
 *  only the shrinking `knownDebt` set. Throws when a new or regressed route is
 *  uncovered, or when a `knownDebt` entry is stale (its route is now covered or
 *  no longer exists). Tracked debt is surfaced as a `console.warn`, never a
 *  failure. Returns the {@link Report} on success. Call it inside one test:
 *
 *  ```ts
 *  import { test } from 'vitest'
 *  import { Coverage } from 'foldkit/test'
 *
 *  test('every route has a behavioral Scene', () => {
 *    Coverage.everyRouteHasAScene({
 *      routeSource: new URL('./route.ts', import.meta.url),
 *      testDir: import.meta.dirname,
 *      knownDebt: ['Board', 'Triage'],
 *    })
 *  })
 *  ``` */
export const everyRouteHasAScene = (options: Options): Report => {
  const report = audit(options)
  const problems = [
    ...report.errors.map(
      tag =>
        `  - ${tag}: no behavioral Scene. Add describe('route:${tag}', ...).`,
    ),
    ...report.staleDebt.map(
      tag =>
        `  - ${tag}: stale knownDebt entry. It is covered (or gone); remove it from knownDebt.`,
    ),
  ]
  if (problems.length > 0) {
    throw new Error(`Route-coverage ratchet failed:\n${problems.join('\n')}`)
  }
  if (report.debt.length > 0) {
    console.warn(
      `Route-coverage debt: ${report.debt.length} route(s) lack a behavioral Scene:\n` +
        report.debt.map(tag => `  - ${tag}`).join('\n') +
        `\nCover a route, then delete it from knownDebt.`,
    )
  }
  return report
}
