import { Layer } from 'effect'

import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { createStore, provideOtel } from '@livestore/livestore'

import LiveStoreWorker from './livestore.worker?worker'
import { schema } from './schema'
import { ItemsStore } from './store'

const STORE_ID = 'foldkit-cross-tab-tasks'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

export const resources: Layer.Layer<ItemsStore> = Layer.effect(
  ItemsStore,
  createStore({
    adapter,
    schema,
    storeId: STORE_ID,
    batchUpdates: runUpdates => runUpdates(),
    disableDevtools: true,
  }).pipe(provideOtel({})),
).pipe(Layer.orDie)
