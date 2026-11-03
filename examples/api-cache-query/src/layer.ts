import { Layer } from 'effect'
import { Query } from 'foldkit/experimental'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { subscriptions } from './subscription'

export const EffectsLayer = subscriptions.layer
export const AppLayer = Layer.mergeAll(Query.layer, TabsLayer)
