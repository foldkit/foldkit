import { Option } from 'effect'
import { Update } from 'foldkit'

import { DatePicker } from '@foldkit/ui'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'

export const StartDateBinding = makeRequiredFieldBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'startDate',
    init: {
      contextToArgs: ({ entryId, today }) => [
        { id: `${entryId}-start`, today },
      ],
    },
  },
).withOutMessagePolicy({
  fold: outMessage => foldStartDateOutMessage(outMessage),
})

export const EndDateBinding = makeRequiredFieldBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'endDate',
    init: {
      contextToArgs: ({ entryId, today }) => [{ id: `${entryId}-end`, today }],
    },
  },
).withOutMessagePolicy({
  fold: outMessage => foldEndDateOutMessage(outMessage),
})

const foldStartDateOutMessage = makeOutMessageFold(DatePicker.DatePickerBlock, {
  ChangedViewMonth: makeNoopStep,
  SelectedDate: ({ date }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeStartDate: () => Option.some(date),
      })),
      EndDateBinding.informOfMinDateChanged(Option.some(date)),
    ]),
  ClearedDate: () =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeStartDate: () => Option.none(),
      })),
      EndDateBinding.informOfMinDateChanged(Option.none()),
    ]),
})

const foldEndDateOutMessage = makeOutMessageFold(DatePicker.DatePickerBlock, {
  ChangedViewMonth: makeNoopStep,
  SelectedDate: ({ date }) =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeEndDate: () => Option.some(date),
      })),
      StartDateBinding.informOfMaxDateChanged(Option.some(date)),
    ]),
  ClearedDate: () =>
    Update.combineSteps([
      makeFieldsStep(() => ({
        maybeEndDate: () => Option.none(),
      })),
      StartDateBinding.informOfMaxDateChanged(Option.none()),
    ]),
})

export const WorkHistoryEntryComposition = makeComposition({
  bindings: [StartDateBinding, EndDateBinding],
})
