import { Effect, Layer } from 'effect'

import { ApplicationBlock } from './block'
import { People } from './blocks'
import { PeoplePageBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const people = yield* PeoplePageBinding

    return {
      children: [people],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(People.layer))
