import { Effect, Layer } from 'effect'

import { DatePicker } from '@foldkit/ui'

import {
  EndDatePickerBindingWithOutMessagePolicy,
  StartDatePickerBindingWithOutMessagePolicy,
} from './composition'
import { WorkHistoryEntryDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

export const WorkHistoryEntryBlock = WorkHistoryEntryDefinition.contract
export const layer = WorkHistoryEntryDefinition.makeBlock(
  Effect.gen(function* () {
    const startDatePicker = yield* StartDatePickerBindingWithOutMessagePolicy
    const endDatePicker = yield* EndDatePickerBindingWithOutMessagePolicy

    return {
      children: [startDatePicker, endDatePicker],
      init,
      update,
      receive,
      view,
    }
  }),
).provide(Layer.mergeAll(DatePicker.layer)).layer
