import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'
import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { EffectsLayer } from './command'
import { AvailableDateBinding, PronounsBinding } from './composition'
import { PersonalInfoBlock } from './definition'
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
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ListboxLayer, DatePickerLayer)))

export { PersonalInfoBlock } from './definition'
