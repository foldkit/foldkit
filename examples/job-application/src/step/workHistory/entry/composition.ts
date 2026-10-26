import { Option } from 'effect'
import { Update } from 'foldkit'

import { DatePickerBlock } from '@foldkit/ui'

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
)

export const EndDatePickerBinding = WorkHistoryEntryDefinition.makeBinding(
  DatePickerBlock,
  {
    field: 'endDate',
    init: {
      contextToArgs: ({ entryId, today }) => [{ id: `${entryId}-end`, today }],
    },
  },
)

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

const StartDatePickerBindingWithOutMessagePolicy =
  StartDatePickerBinding.withOutMessagePolicy({ fold: foldStartDateOutMessage })

const EndDatePickerBindingWithOutMessagePolicy =
  EndDatePickerBinding.withOutMessagePolicy({ fold: foldEndDateOutMessage })

export const WorkHistoryEntryComposition =
  WorkHistoryEntryDefinition.makeComposition({
    bindings: [
      StartDatePickerBindingWithOutMessagePolicy,
      EndDatePickerBindingWithOutMessagePolicy,
    ],
  })
