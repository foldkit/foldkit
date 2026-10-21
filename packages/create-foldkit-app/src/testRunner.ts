import { Array, Match, Option, pipe } from 'effect'

import { vitestOnlyExamples } from './examples.js'
import { type Scaffold } from './rendering.js'
import { type PackageManager } from './utils/packages.js'

export const TEST_RUNNER_VALUES = ['vitest', 'bun'] as const

export type TestRunner = (typeof TEST_RUNNER_VALUES)[number]

const bunRunnerConflict = (
  packageManager: PackageManager,
  scaffold: Scaffold,
): Option.Option<string> => {
  if (packageManager !== 'bun') {
    return Option.some(
      `The bun test runner requires the bun package manager, not ${packageManager}.`,
    )
  } else {
    return Match.value(scaffold).pipe(
      Match.tagsExhaustive({
        Spa: ({ example }) =>
          pipe(
            vitestOnlyExamples,
            Array.findFirst(entry => entry.example === example),
            Option.map(
              ({ reason }) =>
                `The ${example} example needs the vitest test runner: ${reason}.`,
            ),
          ),
        Ssg: () => Option.none(),
        Ssr: () => Option.none(),
      }),
    )
  }
}

/**
 * The reason a resolved scaffold cannot use the chosen test runner. The bun
 * runner needs the bun package manager and a starter example whose tests run
 * under `bun:test`.
 */
export const testRunnerConflict = (
  testRunner: TestRunner,
  packageManager: PackageManager,
  scaffold: Scaffold,
): Option.Option<string> =>
  Match.value(testRunner).pipe(
    Match.when('vitest', () => Option.none()),
    Match.when('bun', () => bunRunnerConflict(packageManager, scaffold)),
    Match.exhaustive,
  )
