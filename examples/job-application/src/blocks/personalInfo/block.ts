import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'
import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { EffectsLayer } from './command'
import { AvailableDateBinding, PronounsBinding } from './composition'
import { PersonalInfoDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const PersonalInfoBlock = PersonalInfoDefinition.contract
export const layer = PersonalInfoDefinition.makeBlock(
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
).provide(Layer.mergeAll(ListboxLayer, DatePickerLayer)).layer
