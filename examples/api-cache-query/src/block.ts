import { Effect } from 'effect'

import {
  PostDetailsBinding,
  PostsBinding,
  StatsBinding,
  TabsBinding,
} from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
)
