import type { Layer } from 'effect'

import { ItemsStoreLayer, type ItemsStoreRequirements } from './store'

export const resources: Layer.Layer<ItemsStoreRequirements> = ItemsStoreLayer
