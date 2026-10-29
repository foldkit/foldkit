import { Block } from 'foldkit'

const OutMessage = defineMessageUnion({
  SelectedEndDate: { date: Schema.String },
  CompletedRange: { startDate: Schema.String, endDate: Schema.String },
})
type OutMessage = typeof OutMessage.Type

const DateRangeDefinition = Block.makeDefinition('DateRange', {
  Model,
  Message,
  OutMessage,
})

const { makeStep } = DateRangeDefinition

const EndDatePickerBinding = DateRangeDefinition.makeBinding(
  DatePicker.DatePickerBlock,
  {
    field: 'endDatePicker',
  },
).withOutMessagePolicy({
  fold: foldEndDateOutMessage,
  forward: DateRangeDefinition.makeOutMessageForward({
    SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
  }),
})

const restoreEndDateStep = makeStep(() => EndDatePickerBinding.requestRestore())
