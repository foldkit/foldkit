import { Effect } from 'effect'

import { TabsBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const tabs = yield* TabsBinding

    return { children: [tabs], init, update, view, subscriptions, EffectsLayer }
  }),
)
