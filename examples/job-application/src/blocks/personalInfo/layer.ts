import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'
import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { PersonalInfoBlock } from './block'
import { ValidateEmailAsync } from './command'
import { AvailableDateBinding, PronounsBinding } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = PersonalInfoBlock.makeLayer(
  Effect.gen(function* () {
    const pronounsListbox = yield* PronounsBinding
    const availableDatePicker = yield* AvailableDateBinding

    return {
      children: [pronounsListbox, availableDatePicker],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: ValidateEmailAsync.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ListboxLayer, DatePickerLayer)))
