import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import foldkitPackageJson from '../../../foldkit/package.json?raw'
import installSource from '../snippet/getStartedInstallFoldkit.sh?raw'
import getStartedSource from './getStarted.md?raw'

// NOTE: The install instructions pin an exact Effect release. The nightly
// Effect-bump job rewrites package.json and pnpm-workspace.yaml but not prose,
// so without this guard the getting-started version silently drifts from what
// Foldkit ships.
const FoldkitPackageJson = Schema.Struct({
  devDependencies: Schema.Struct({
    effect: Schema.String,
    '@effect/platform-browser': Schema.String,
  }),
})
type FoldkitPackageJson = typeof FoldkitPackageJson.Type

const { devDependencies } = Schema.decodeUnknownSync(FoldkitPackageJson)(
  JSON.parse(foldkitPackageJson),
)

const EFFECT_VERSION_PATTERN =
  /(?<=effect@|@effect\/platform-browser@)\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g

describe('getting started install instructions', () => {
  test.each([
    { name: 'prose', source: getStartedSource },
    { name: 'copyable command', source: installSource },
  ])('pins the tested Effect release in $name', ({ source }) => {
    const mentionedVersions = source.match(EFFECT_VERSION_PATTERN) ?? []
    const distinctVersions = [...new Set(mentionedVersions)]

    expect(devDependencies['@effect/platform-browser']).toBe(
      devDependencies.effect,
    )
    expect(distinctVersions).toEqual([devDependencies.effect])
  })
})
