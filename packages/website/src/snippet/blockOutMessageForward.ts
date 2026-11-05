import { makeOutMessageForward, makeBinding } from './block'

const forwardDatePickerOutMessage = makeOutMessageForward(DatePickerBlock, {
  SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
  Closed: () => undefined,
})

export const DatePickerBinding = makeBinding(DatePickerBlock, {
  field: 'datePicker',
}).withOutMessagePolicy({ forward: forwardDatePickerOutMessage })
