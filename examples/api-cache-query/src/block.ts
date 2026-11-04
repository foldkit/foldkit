import { Effect, Layer } from 'effect'
import { Query } from 'foldkit/experimental'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import {
  PostDetailsBinding,
  PostsBinding,
  StatsBinding,
  TabsBinding,
} from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const tabs = yield* TabsBinding
    const posts = yield* PostsBinding
    const stats = yield* StatsBinding
    const postDetails = yield* PostDetailsBinding

    return {
      children: [tabs, posts, stats, postDetails],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Query.layer, TabsLayer)))

export { ApplicationBlock } from './definition'
