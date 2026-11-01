import { Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import foldkitPackageJson from '../../../foldkit/package.json?raw'
import getStartedInstallSource from '../snippet/getStartedInstallFoldkit.sh?raw'

const FoldkitPackageJson = Schema.Struct({
  peerDependencies: Schema.Struct({
    effect: Schema.String,
    '@effect/platform-browser': Schema.String,
  }),
})

const { peerDependencies } = Schema.decodeUnknownSync(FoldkitPackageJson)(
  JSON.parse(foldkitPackageJson),
)

describe('getting started install instructions', () => {
  test('install the Effect peer ranges supported by Foldkit', () => {
    const installArguments = getStartedInstallSource.trim().split(/\s+/)

    expect(installArguments).toContain(`effect@${peerDependencies.effect}`)
    expect(installArguments).toContain(
      `@effect/platform-browser@${peerDependencies['@effect/platform-browser']}`,
    )
  })
})
