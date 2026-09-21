import { Schema } from 'effect'
import type { Plugin } from 'vite'
import { expect, expectTypeOf, it } from 'vitest'

import {
  type FoldkitBuildApi,
  FoldkitBuildMetadata,
  foldkitBuild,
} from '@foldkit/vite-plugin'

it('publishes the metadata Schema and typed build plugin', () => {
  const plugin = foldkitBuild('/entry.server.ts')
  expectTypeOf(plugin).toEqualTypeOf<Plugin<FoldkitBuildApi>>()
  expectTypeOf<
    FoldkitBuildApi['getBuildMetadata']
  >().returns.toEqualTypeOf<FoldkitBuildMetadata>()
  expect(Schema.is(FoldkitBuildMetadata)({})).toBe(false)
})
