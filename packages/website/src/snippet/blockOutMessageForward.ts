import { makeOutMessageForward, makeRequiredFieldBinding } from './block'

const forwardDatePickerOutMessage = makeOutMessageForward(DatePickerBlock, {
  SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
  Closed: () => undefined,
})

export const DatePickerBinding = makeRequiredFieldBinding(DatePickerBlock, {
  field: 'datePicker',
}).withOutMessagePolicy({ forward: forwardDatePickerOutMessage })
