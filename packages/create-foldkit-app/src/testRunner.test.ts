import { Option, String, pipe } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Scaffold } from './rendering.js'
import { testRunnerConflict } from './testRunner.js'
import { type PackageManager } from './utils/packages.js'

describe('testRunnerConflict', () => {
  it('accepts the vitest runner with every package manager and example', () => {
    expect(
      testRunnerConflict('vitest', 'pnpm', Scaffold.Spa({ example: 'map' })),
    ).toEqual(Option.none())
  })

  it('accepts the bun runner with the bun package manager for every rendering', () => {
    expect(
      testRunnerConflict('bun', 'bun', Scaffold.Spa({ example: 'counter' })),
    ).toEqual(Option.none())
    expect(testRunnerConflict('bun', 'bun', Scaffold.Ssg())).toEqual(
      Option.none(),
    )
    expect(testRunnerConflict('bun', 'bun', Scaffold.Ssr())).toEqual(
      Option.none(),
    )
  })

  it('rejects the bun runner with any other package manager', () => {
    const otherPackageManagers: ReadonlyArray<PackageManager> = [
      'pnpm',
      'npm',
      'yarn',
    ]

    for (const packageManager of otherPackageManagers) {
      expect(
        pipe(
          testRunnerConflict('bun', packageManager, Scaffold.Ssr()),
          Option.exists(String.includes(packageManager)),
        ),
      ).toBe(true)
    }
  })

  it('rejects the bun runner for examples whose sources need Vitest, naming the source', () => {
    expect(
      pipe(
        testRunnerConflict('bun', 'bun', Scaffold.Spa({ example: 'map' })),
        Option.exists(String.includes('src/mount.test.ts')),
      ),
    ).toBe(true)
    expect(
      pipe(
        testRunnerConflict(
          'bun',
          'bun',
          Scaffold.Spa({ example: 'pixel-art' }),
        ),
        Option.exists(String.includes('src/main.bench.ts')),
      ),
    ).toBe(true)
  })
})
