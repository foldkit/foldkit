import { DatePickerBlock } from './datePicker'
// Before: forwarding a child fact as one of the parent's OutMessages.
import { DateRangeDefinition, OutMessage } from './definition'

export const EndDateBinding = DateRangeDefinition.makeBinding(DatePickerBlock, {
  field: 'endDate',
}).withOutMessagePolicy({
  forward: DateRangeDefinition.makeOutMessageForward({
    SelectedDate: ({ date }) => OutMessage.SelectedEndDate({ date }),
  }),
})
