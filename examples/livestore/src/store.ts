import { Store } from '@livestore/livestore/effect'

import { schema, tables } from './schema'

const STORE_ID = 'foldkit-cross-tab-tasks'

export class ItemsStore extends Store.Tag(schema, STORE_ID) {}
export type ItemsStoreRequirements = typeof ItemsStore.Id

export const orderedItemsQuery = tables.items.orderBy('createdAt', 'asc')
