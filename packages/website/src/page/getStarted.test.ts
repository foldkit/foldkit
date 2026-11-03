import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import foldkitPackageJson from '../../../foldkit/package.json?raw'
import getStartedInstallSource from '../snippet/getStartedInstallFoldkit.sh?raw'
import getStartedSource from './getStarted.md?raw'

const FoldkitPackageJson = Schema.Struct({
  peerDependencies: Schema.Struct({
    effect: Schema.String,
    '@effect/platform-browser': Schema.String,
  }),
})
type FoldkitPackageJson = typeof FoldkitPackageJson.Type

const { peerDependencies } = Schema.decodeUnknownSync(FoldkitPackageJson)(
  JSON.parse(foldkitPackageJson),
)

describe('getting started install instructions', () => {
  test('installs the Effect peer ranges supported by Foldkit', () => {
    const installArguments = getStartedInstallSource.trim().split(/\s+/)

    expect(installArguments).toContain(`effect@${peerDependencies.effect}`)
    expect(installArguments).toContain(
      `@effect/platform-browser@${peerDependencies['@effect/platform-browser']}`,
    )
  })

  test('explains the supported Effect minor in prose', () => {
    expect(peerDependencies['@effect/platform-browser']).toBe(
      peerDependencies.effect,
    )
    expect(getStartedSource).toContain(`\`${peerDependencies.effect}\``)
  })
})
