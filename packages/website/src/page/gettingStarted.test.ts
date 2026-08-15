import { Schema as S } from 'effect'
import { describe, expect, test } from 'vitest'

import foldkitPackageJson from '../../../foldkit/package.json?raw'
import gettingStartedSource from './gettingStarted.md?raw'

// NOTE: The install instructions pin an exact Effect prerelease. The nightly
// Effect-bump job rewrites package.json and pnpm-workspace.yaml but not prose,
// so without this guard the getting-started version silently drifts from what
// Foldkit ships.
const FoldkitPackageJson = S.Struct({
  peerDependencies: S.Struct({ effect: S.String }),
})

const { peerDependencies } = S.decodeUnknownSync(FoldkitPackageJson)(
  JSON.parse(foldkitPackageJson),
)

const PRERELEASE_VERSION_PATTERN = /\d+\.\d+\.\d+-(?:beta|rc)\.\d+/g

describe('getting started install instructions', () => {
  test('pin the exact Effect prerelease that Foldkit depends on', () => {
    const mentionedVersions =
      gettingStartedSource.match(PRERELEASE_VERSION_PATTERN) ?? []
    const distinctVersions = [...new Set(mentionedVersions)]

    expect(distinctVersions).toEqual([peerDependencies.effect])
  })
})
