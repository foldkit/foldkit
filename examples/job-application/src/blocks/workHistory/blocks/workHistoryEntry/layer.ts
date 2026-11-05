import { Effect, Layer } from 'effect'

import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'

import { WorkHistoryEntryBlock } from './block'
import { EndDateBinding, StartDateBinding } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = WorkHistoryEntryBlock.makeLayer(
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
).pipe(Layer.provide(Layer.mergeAll(DatePickerLayer)))
