import { Option } from 'effect'
import { Update } from 'foldkit'

import { DatePickerBlock } from '@foldkit/ui/datePicker'

import {
  WorkHistoryEntryBlock,
  makeFieldsStep,
  makeNoopStep,
} from './definition'

export const StartDateBinding = WorkHistoryEntryBlock.makeBinding(
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

export const EndDateBinding = WorkHistoryEntryBlock.makeBinding(
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

const foldStartDateOutMessage = WorkHistoryEntryBlock.makeOutMessageFold(
  DatePickerBlock,
  {
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
  },
)

const foldEndDateOutMessage = WorkHistoryEntryBlock.makeOutMessageFold(
  DatePickerBlock,
  {
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
  },
)

export const WorkHistoryEntryComposition =
  WorkHistoryEntryBlock.makeComposition({
    bindings: [StartDateBinding, EndDateBinding],
  })
