import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'
import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { EffectsLayer } from './command'
import {
  AvailableDatePickerBinding,
  PronounsListboxBinding,
} from './composition'
import { PersonalInfoDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const PersonalInfoBlock = PersonalInfoDefinition.contract
export const layer = PersonalInfoDefinition.makeBlock(
  Effect.gen(function* () {
    const pronounsListbox = yield* PronounsListboxBinding
    const availableDatePicker = yield* AvailableDatePickerBinding

    return {
      children: [pronounsListbox, availableDatePicker],
      init,
      update,
      receive,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(ListboxLayer, DatePickerLayer)).layer
