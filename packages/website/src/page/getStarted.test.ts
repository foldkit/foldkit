import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import foldkitPackageJson from '../../../foldkit/package.json?raw'
import getStartedSource from './getStarted.md?raw'

// NOTE: The install instructions pin an exact Effect release. The nightly
// Effect-bump job rewrites package.json and pnpm-workspace.yaml but not prose,
// so without this guard the getting-started version silently drifts from what
// Foldkit ships.
const FoldkitPackageJson = Schema.Struct({
  peerDependencies: Schema.Struct({ effect: Schema.String }),
})

const { peerDependencies } = Schema.decodeUnknownSync(FoldkitPackageJson)(
  JSON.parse(foldkitPackageJson),
)

const EFFECT_VERSION_PATTERN =
  /(?<=effect@|@effect\/platform-browser@)\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g

describe('getting started install instructions', () => {
  test('pin the exact Effect release that Foldkit depends on', () => {
    const mentionedVersions =
      getStartedSource.match(EFFECT_VERSION_PATTERN) ?? []
    const distinctVersions = [...new Set(mentionedVersions)]

    expect(distinctVersions).toEqual([peerDependencies.effect])
  })
})
