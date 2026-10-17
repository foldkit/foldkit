import { Option } from 'effect'
import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DatePicker } from '@foldkit/ui'
import { reflectMaxDate, reflectMinDate } from '@foldkit/ui/datePicker'

import { Message, type Model, WorkHistoryEntry } from './definition'

const foldStartDateOutMessage = DatePicker.OutMessage.match<
  Update.Step<Model, Message>
>({
  ChangedViewMonth: () => model => ({ model }),
  SelectedDate:
    ({ date }) =>
    model => ({
      model: modifyFields(model, {
        maybeStartDate: () => Option.some(date),
        endDate: reflectMinDate(Option.some(date)),
      }),
    }),
  ClearedDate: () => model => ({
    model: modifyFields(model, {
      maybeStartDate: () => Option.none(),
      endDate: reflectMinDate(Option.none()),
    }),
  }),
})

export const StartDatePickerBinding = WorkHistoryEntry.bindChild(
  DatePicker.block,
  {
    field: 'startDate',
    parentMessage: Message.GotStartDateMessage,
    init: {
      args: ({ entryId, today }) => [{ id: `${entryId}-start`, today }],
    },
    outMessage: { fold: foldStartDateOutMessage },
  },
)

const foldEndDateOutMessage = DatePicker.OutMessage.match<
  Update.Step<Model, Message>
>({
  ChangedViewMonth: () => model => ({ model }),
  SelectedDate:
    ({ date }) =>
    model => ({
      model: modifyFields(model, {
        maybeEndDate: () => Option.some(date),
        startDate: reflectMaxDate(Option.some(date)),
      }),
    }),
  ClearedDate: () => model => ({
    model: modifyFields(model, {
      maybeEndDate: () => Option.none(),
      startDate: reflectMaxDate(Option.none()),
    }),
  }),
})

export const EndDatePickerBinding = WorkHistoryEntry.bindChild(
  DatePicker.block,
  {
    field: 'endDate',
    parentMessage: Message.GotEndDateMessage,
    init: {
      args: ({ entryId, today }) => [{ id: `${entryId}-end`, today }],
    },
    outMessage: { fold: foldEndDateOutMessage },
  },
)

export const WorkHistoryEntryComposition = WorkHistoryEntry.makeComposition({
  childBindings: [StartDatePickerBinding, EndDatePickerBinding],
})
