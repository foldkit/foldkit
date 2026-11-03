import { Option } from 'effect'
import { Update } from 'foldkit'

import { DatePickerBlock } from '@foldkit/ui/datePicker'

import {
  WorkHistoryEntryDefinition,
  makeFieldsStep,
  makeNoopStep,
} from './definition'

export const StartDatePickerBinding = WorkHistoryEntryDefinition.makeBinding(
  DatePickerBlock,
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

export const EndDatePickerBinding = WorkHistoryEntryDefinition.makeBinding(
  DatePickerBlock,
  {
    field: 'endDate',
    init: {
      contextToArgs: ({ entryId, today }) => [{ id: `${entryId}-end`, today }],
    },
  },
).withOutMessagePolicy({
  fold: outMessage => foldEndDateOutMessage(outMessage),
})

const foldStartDateOutMessage = WorkHistoryEntryDefinition.makeOutMessageFold(
  DatePickerBlock,
  {
    ChangedViewMonth: makeNoopStep,
    SelectedDate: ({ date }) =>
      Update.combineSteps([
        makeFieldsStep(() => ({
          maybeStartDate: () => Option.some(date),
        })),
        EndDatePickerBinding.informMinDateChanged(Option.some(date)),
      ]),
    ClearedDate: () =>
      Update.combineSteps([
        makeFieldsStep(() => ({
          maybeStartDate: () => Option.none(),
        })),
        EndDatePickerBinding.informMinDateChanged(Option.none()),
      ]),
  },
)

const foldEndDateOutMessage = WorkHistoryEntryDefinition.makeOutMessageFold(
  DatePickerBlock,
  {
    ChangedViewMonth: makeNoopStep,
    SelectedDate: ({ date }) =>
      Update.combineSteps([
        makeFieldsStep(() => ({
          maybeEndDate: () => Option.some(date),
        })),
        StartDatePickerBinding.informMaxDateChanged(Option.some(date)),
      ]),
    ClearedDate: () =>
      Update.combineSteps([
        makeFieldsStep(() => ({
          maybeEndDate: () => Option.none(),
        })),
        StartDatePickerBinding.informMaxDateChanged(Option.none()),
      ]),
  },
)

export const WorkHistoryEntryComposition =
  WorkHistoryEntryDefinition.makeComposition({
    bindings: [StartDatePickerBinding, EndDatePickerBinding],
  })
