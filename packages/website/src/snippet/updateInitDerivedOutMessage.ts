import { Block } from 'foldkit'

const OutMessage = defineMessageUnion({
  SelectedEndDate: { date: Schema.String },
  CompletedRange: { startDate: Schema.String, endDate: Schema.String },
})

const DateRange = Block.define('DateRange', { Model, Message, OutMessage })

const EndDatePickerBinding = DateRange.bindChild(DatePicker.block, {
  field: 'endDatePicker',
  parentMessage: Message.GotEndDateMessage,
  outMessage: {
    fold: foldEndDateOutMessage,
    forward: DatePicker.OutMessage.match({
      SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
    }),
  },
})

const restoreEndDate = DateRange.step(() => EndDatePickerBinding.restore())
