const forwardDatePickerOutMessage = DateRangeBlock.makeOutMessageForward(
  DatePickerBlock,
  {
    SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
    Closed: () => undefined,
  },
)

export const DatePickerBinding = DateRangeBlock.makeBinding(DatePickerBlock, {
  field: 'datePicker',
}).withOutMessagePolicy({ forward: forwardDatePickerOutMessage })
