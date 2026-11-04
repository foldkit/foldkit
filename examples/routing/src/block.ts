import { Effect, Layer } from 'effect'

import { People } from './blocks'
import { PeoplePageBinding } from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
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

export { ApplicationBlock } from './definition'
