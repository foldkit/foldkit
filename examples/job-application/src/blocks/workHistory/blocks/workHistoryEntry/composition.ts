import { Option } from 'effect'
import { Update } from 'foldkit'

import { DatePicker } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} from './block'

export const StartDateBinding = makeBinding(DatePicker.DatePickerBlock, {
  field: 'startDate',
  init: {
    contextToArgs: ({ entryId, today }) => [{ id: `${entryId}-start`, today }],
  },
}).withOutMessagePolicy({
  fold: outMessage => foldStartDateOutMessage(outMessage),
})

export const EndDateBinding = makeBinding(DatePicker.DatePickerBlock, {
  field: 'endDate',
  init: {
    contextToArgs: ({ entryId, today }) => [{ id: `${entryId}-end`, today }],
  },
}).withOutMessagePolicy({
  fold: outMessage => foldEndDateOutMessage(outMessage),
})

const foldStartDateOutMessage = makeOutMessageFold(DatePicker.DatePickerBlock, {
  ChangedViewMonth: makeNoopStep,
  SelectedDate: ({ date }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeStartDate: () => Option.some(date),
      })),
      EndDateBinding.informMinDateChanged(Option.some(date)),
    ]),
  ClearedDate: () =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeStartDate: () => Option.none(),
      })),
      EndDateBinding.informMinDateChanged(Option.none()),
    ]),
})

const foldEndDateOutMessage = makeOutMessageFold(DatePicker.DatePickerBlock, {
  ChangedViewMonth: makeNoopStep,
  SelectedDate: ({ date }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeEndDate: () => Option.some(date),
      })),
      StartDateBinding.informMaxDateChanged(Option.some(date)),
    ]),
  ClearedDate: () =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeEndDate: () => Option.none(),
      })),
      StartDateBinding.informMaxDateChanged(Option.none()),
    ]),
})

export const WorkHistoryEntryComposition = makeComposition({
  bindings: [StartDateBinding, EndDateBinding],
})
