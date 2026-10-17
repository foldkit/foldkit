import { Layer } from 'effect'

import { PagefindLayer } from './search'
import { LocalStorageLayer, SessionStorageLayer } from './storage'

export const ApplicationLayer = Layer.mergeAll(
  LocalStorageLayer,
  SessionStorageLayer,
  PagefindLayer,
)
