import { makeOutMessageStep } from './definition'
import { OutMessage } from './outMessage'

export const clearFilters = makeOutMessageStep(() =>
  OutMessage.RequestedClearFilters(),
)
