import { Effect, Layer } from 'effect'

import { DatePicker, Listbox } from '@foldkit/ui'

import { PersonalInfoBlock } from './block'
import { ValidateEmailAsync } from './command'
import { PersonalInfoComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = PersonalInfoBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* PersonalInfoComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: ValidateEmailAsync.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Listbox.layer, DatePicker.layer)))
