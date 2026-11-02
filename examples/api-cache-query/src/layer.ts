import { Layer } from 'effect'
import { Query } from 'foldkit/experimental'

import { Tabs } from '@foldkit/ui'

import { subscriptions } from './subscription'

export const EffectsLayer = subscriptions.layer
export const AppLayer = Layer.mergeAll(Query.layer, Tabs.layer)
