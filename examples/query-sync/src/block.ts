import { Effect, Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { EffectsLayer } from './command'
import { DietListboxBinding, PeriodListboxBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
).provide(Layer.mergeAll(Listbox.layer))
