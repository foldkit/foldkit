import { Layer } from 'effect'

import { KeyedQueryLayer } from './keyedQueryImplementation.js'
import { QueryLayer } from './queryImplementation.js'

/** Supplies shared Query constructors without building Fetch handlers. */
export const layer = Layer.mergeAll(QueryLayer, KeyedQueryLayer)
