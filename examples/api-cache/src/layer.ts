import { Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { FetchPostDetail, FetchPosts, FetchStats } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  FetchPosts.layer,
  FetchPostDetail.layer,
  FetchStats.layer,
  subscriptions.layer,
)

export const AppLayer = Tabs.layer
