import { Effect } from 'effect'

import { People } from './blocks'
import { PeoplePageBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
).provide(People.layer)
