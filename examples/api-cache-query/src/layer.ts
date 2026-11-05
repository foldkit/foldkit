import { Effect, Layer } from 'effect'
import { Query } from 'foldkit/experimental'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { ApplicationBlock } from './block'
import {
  PostDetailsBinding,
  PostsBinding,
  StatsBinding,
  TabsBinding,
} from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
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
