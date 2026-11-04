import { Effect, Layer } from 'effect'
import { Program } from 'foldkit'

import { SettingsStore } from './blockDefinition'
import { ApplicationBlock, layer } from './blockProfile'

const SettingsStoreTestLayer = Layer.succeed(SettingsStore, {
  saveTheme: () => Effect.void,
})

// Graph construction uses the same Settings implementation. The host chooses
// the storage Service consumed by its Command handler constructor.
export const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
}).provide(SettingsStoreTestLayer)
