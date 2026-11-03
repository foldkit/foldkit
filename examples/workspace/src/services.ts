import { Layer } from 'effect'

import { layer } from './block'
import { WorkspaceRepositoryLayer } from './repository'

export const AppLayer = Layer.mergeAll(layer, WorkspaceRepositoryLayer)
