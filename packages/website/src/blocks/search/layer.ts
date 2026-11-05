import { Effect, Layer } from 'effect'

import { Dialog } from '@foldkit/ui'

import { SearchBlock } from './block'
import { DialogBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = SearchBlock.makeLayer(
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
).pipe(Layer.provide(Layer.mergeAll(Dialog.layer)))
