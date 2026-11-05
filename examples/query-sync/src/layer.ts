import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { ApplicationBlock } from './block'
import { DietListboxBinding, PeriodListboxBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const dietListbox = yield* DietListboxBinding
    const periodListbox = yield* PeriodListboxBinding

    return {
      children: [dietListbox, periodListbox],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ListboxLayer)))
