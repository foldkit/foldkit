import { createBuilder } from 'vite'

import type { FoldkitBuildApi } from '@foldkit/vite-plugin'

const builder = await createBuilder()
await builder.buildApp()

const plugin = builder.config.plugins.find(
  plugin => plugin.name === 'foldkit:build',
)

if (plugin !== undefined) {
  const api: FoldkitBuildApi | undefined = plugin.api

  if (typeof api?.getBuildMetadata !== 'function') {
    throw new Error('This Foldkit version does not expose build metadata')
  }

  const metadata = api.getBuildMetadata()
  console.log(metadata.serverEntry)
  console.log(metadata.manifest.prerendered)
}
