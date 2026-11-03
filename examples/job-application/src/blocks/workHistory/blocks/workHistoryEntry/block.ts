import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'

import { EndDatePickerBinding, StartDatePickerBinding } from './composition'
import { WorkHistoryEntryDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const WorkHistoryEntryBlock = WorkHistoryEntryDefinition.contract
export const layer = WorkHistoryEntryDefinition.makeBlock(
  Effect.gen(function* () {
    const startDatePicker = yield* StartDatePickerBinding
    const endDatePicker = yield* EndDatePickerBinding

    return {
      children: [startDatePicker, endDatePicker],
      init,
      update,
      receive,
      view,
    }
  }),
).provide(Layer.mergeAll(DatePickerLayer)).layer
