import { Effect, Layer } from 'effect'

import { layer as DialogLayer } from '@foldkit/ui/dialog'

import { ScrollActiveResult } from './command'
import { DialogBinding } from './composition'
import { CommandPaletteDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
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
      receive,
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
