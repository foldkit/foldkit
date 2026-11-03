import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'

import { EndDateBinding, StartDateBinding } from './composition'
import { WorkHistoryEntryDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const WorkHistoryEntryBlock = WorkHistoryEntryDefinition.contract
export const layer = WorkHistoryEntryDefinition.makeBlock(
  Effect.gen(function* () {
    const startDatePicker = yield* StartDateBinding
    const endDatePicker = yield* EndDateBinding

    return {
      children: [startDatePicker, endDatePicker],
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).provide(Layer.mergeAll(DatePickerLayer)).layer
