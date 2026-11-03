import { Effect, Layer } from 'effect'

import { layer as DialogLayer } from '@foldkit/ui/dialog'

import { ScrollActiveResult } from './command'
import { DialogBinding } from './composition'
import { CommandPaletteDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const CommandPaletteImplementation = CommandPaletteDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding

    return {
      children: [dialog],
      init,
      update,
      inMessageUpdate,
      view,
      subscriptions,
      EffectsLayer: Layer.mergeAll(
        subscriptions.layer,
        ScrollActiveResult.layer,
      ),
    }
  }),
).provide(DialogLayer)

export const layer = CommandPaletteImplementation.layer
