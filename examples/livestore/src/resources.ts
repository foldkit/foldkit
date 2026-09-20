import { Layer, pipe } from 'effect'

import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { provideOtel } from '@livestore/livestore'

import LiveStoreWorker from './livestore.worker?worker'
import { ItemsStore, type ItemsStoreRequirements } from './store'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

export const resources: Layer.Layer<ItemsStoreRequirements> = pipe(
  ItemsStore.layer({
    adapter,
    batchUpdates: runUpdates => runUpdates(),
    disableDevtools: true,
  }),
  Layer.build,
  provideOtel({}),
  Layer.effectContext,
  Layer.orDie,
)
