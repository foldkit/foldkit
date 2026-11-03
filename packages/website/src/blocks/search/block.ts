import { Effect, Layer } from 'effect'

import { layer as DialogLayer } from '@foldkit/ui/dialog'

import { DialogBinding } from './composition'
import { SearchDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { EffectsLayer } from './layer'
import { update } from './update'
import { view } from './view'

export const SearchBlock = SearchDefinition.contract

const block = SearchDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding

    return {
      children: [dialog],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(DialogLayer))
export const layer = block.layer
