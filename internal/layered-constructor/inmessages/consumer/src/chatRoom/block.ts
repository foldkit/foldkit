import { Effect } from 'effect'

import { MessageComposerBinding } from './composition'
import { makeBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { managedResources } from './managedResource'
import { receive } from './receive'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const ChatRoomBlock = makeBlock(
  Effect.gen(function* () {
    const messageComposer = yield* MessageComposerBinding

    return {
      children: [messageComposer],
      init,
      update,
      receive,
      view,
      subscriptions,
      managedResources,
      EffectsLayer,
    }
  }),
)
