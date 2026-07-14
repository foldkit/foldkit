import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import * as Coverage from './coverage.js'

// A minimal on-disk Foldkit app: a route registry plus co-located test files.
type Fixture = Readonly<{
  root: string
  routeSource: string
  writeRoute: (tags: ReadonlyArray<string>) => void
  writeTest: (name: string, coveredTags: ReadonlyArray<string>) => void
}>

const fixtures: Array<string> = []

const makeFixture = (): Fixture => {
  const root = mkdtempSync(join(tmpdir(), 'fk-coverage-'))
  fixtures.push(root)
  const routeSource = join(root, 'route.ts')
  return {
    root,
    routeSource,
    writeRoute: tags => {
      const body = tags
        .map(tag => `export const ${tag}Route = r('${tag}')`)
        .join('\n')
      writeFileSync(routeSource, `import { r } from 'foldkit/route'\n${body}\n`)
    },
    writeTest: (name, coveredTags) => {
      const body = coveredTags
        .map(tag => `describe('route:${tag}', () => { test('x', () => {}) })`)
        .join('\n')
      writeFileSync(
        join(root, name),
        `import { describe, test } from 'vitest'\n${body}\n`,
      )
    },
  }
}

afterEach(() => {
  fixtures.length = 0
})

describe('Coverage.audit', () => {
  test('reads the route registry from r(...) declarations, dropping ignored fallbacks', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home', 'Weather', 'NotFound'])
    fixture.writeTest('home.test.ts', [])

    const report = Coverage.audit({
      routeSource: fixture.routeSource,
      testDir: fixture.root,
    })

    expect(report.registry).toEqual(['Home', 'Weather'])
  })

  test('the marker convention and ignore set are configurable', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Dashboard', 'Login', 'NotFound'])
    // A bespoke marker: describe('screen:Dashboard', ...)
    writeFileSync(
      join(fixture.root, 'dashboard.test.ts'),
      `describe('screen:Dashboard', () => {})\n`,
    )

    const report = Coverage.audit({
      routeSource: fixture.routeSource,
      testDir: fixture.root,
      ignore: ['NotFound', 'Login'],
      markerPattern: /describe\(\s*['"`]screen:(\w+)['"`]/g,
    })

    expect(report.registry).toEqual(['Dashboard'])
    expect(report.covered).toEqual(['Dashboard'])
    expect(report.uncovered).toEqual([])
  })

  test('a route with a describe(route:Tag) marker counts as covered', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home', 'Weather'])
    fixture.writeTest('home.test.ts', ['Home'])

    const report = Coverage.audit({
      routeSource: fixture.routeSource,
      testDir: fixture.root,
    })

    expect(report.covered).toEqual(['Home'])
    expect(report.uncovered).toEqual(['Weather'])
    expect(report.errors).toEqual(['Weather'])
  })
})

describe('Coverage.everyRouteHasAScene', () => {
  const run =
    (fixture: Fixture, knownDebt: ReadonlyArray<string> = []) =>
    () =>
      Coverage.everyRouteHasAScene({
        routeSource: fixture.routeSource,
        testDir: fixture.root,
        knownDebt,
      })

  test('throws, naming the route, when a route has no Scene', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home', 'Weather'])
    fixture.writeTest('home.test.ts', ['Home'])

    expect(run(fixture)).toThrow(/Weather/)
  })

  test('passes when every route is covered', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home', 'Weather'])
    fixture.writeTest('home.test.ts', ['Home'])
    fixture.writeTest('weather.test.ts', ['Weather'])

    expect(run(fixture)).not.toThrow()
  })

  test('a knownDebt route is allowed to lack a Scene and surfaces as tracked debt', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home', 'Weather'])
    fixture.writeTest('home.test.ts', ['Home'])

    expect(run(fixture, ['Weather'])).not.toThrow()

    const report = Coverage.audit({
      routeSource: fixture.routeSource,
      testDir: fixture.root,
      knownDebt: ['Weather'],
    })
    expect(report.errors).toEqual([])
    expect(report.debt).toEqual(['Weather'])
  })

  test('a stale knownDebt entry (route now covered) throws so the ratchet re-arms', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home', 'Weather'])
    fixture.writeTest('home.test.ts', ['Home'])
    fixture.writeTest('weather.test.ts', ['Weather'])

    expect(run(fixture, ['Weather'])).toThrow(/stale/)
  })

  test('a knownDebt entry naming no existing route is flagged as stale', () => {
    const fixture = makeFixture()
    fixture.writeRoute(['Home'])
    fixture.writeTest('home.test.ts', ['Home'])

    expect(run(fixture, ['Ghost'])).toThrow(/Ghost/)
  })
})
